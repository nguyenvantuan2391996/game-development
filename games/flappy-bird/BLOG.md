# Flappy Bird: khi AI tự học lại "chết" nhiều lần hơn số lần nó thực sự chết

Flappy Bird trong repo này có một bí mật nhỏ mà README không hề nhắc tới: ngoài chế độ chơi thường, còn có cả một chế độ AI — một agent Q-learning tự vỗ cánh, tự học qua hàng nghìn lần va ống, và lưu lại kiến thức đã học vào `localStorage`. Không mạng nơ-ron, không thư viện machine learning nào cả, chỉ là một object JavaScript đóng vai trò bảng tra cứu.

Cái khó nhất khi cho một cái bảng tra cứu "học" cách chơi Flappy Bird không phải là công thức Q-learning — công thức đó chỉ vài dòng. Cái khó là làm sao nén cả một thế giới liên tục (toạ độ chim, vận tốc rơi, khoảng cách tới ống) xuống thành vài trăm trạng thái rời rạc, đủ ít để bảng học hội tụ được ngay trong trình duyệt:

```javascript
function getFlappyState(bird, nextPipe) {
    const dx = nextPipe.x - bird.x;
    const dy = bird.y - nextPipe.gapCenterY;
    const vy = bird.body.velocity.y;

    const dxBucket = clampInt(Math.floor(dx / 40), -1, 9);
    const dyBucket = clampInt(Math.round(dy / 40), -8, 8);
    let velBucket;
    if (vy < -300) velBucket = 0;
    else if (vy < 0) velBucket = 1;
    else if (vy < 200) velBucket = 2;
    else if (vy < 500) velBucket = 3;
    else velBucket = 4;

    return dxBucket + "_" + dyBucket + "_" + velBucket;
}
```

Ba con số nguyên nhỏ — khoảng cách ngang chia bậc 40px, khoảng cách dọc tới tâm khe hở chia bậc 40px, vận tốc rơi gộp thành 5 mức thô — thay vì hàng triệu tổ hợp toạ độ tuyệt đối. Cả không gian trạng thái gói gọn trong vài trăm khả năng, đủ nhỏ để agent học được sau vài nghìn "kiếp sống" chạy ngay trên máy người chơi.

Chỗ tinh tế thứ hai nằm ở một dòng dễ bị bỏ qua: agent được lưu trong một biến `sharedAgent` ở phạm vi module, không phải thuộc tính của Scene. Lý do là `Scene.restart()` của Phaser huỷ sạch instance Scene cũ và dựng lại từ đầu — nếu agent sống trong Scene, nó sẽ mất trắng sau mỗi lần chim va ống. Đặt nó bên ngoài, chỉ khởi tạo đúng một lần, là cách duy nhất để việc học sống sót qua hàng nghìn lần "chết" liên tiếp.

Nhưng chính cơ chế restart đó lại giấu một con bug khá thú vị. Khi chim va ống, code xử lý episode trông như thế này:

```javascript
if (this.state === "gameover") {
    this.agent.episode += 1;
    this.agent.decayEpsilon();
    if (this.agent.episode % 20 === 0) this.agent.save();
    this.updateAiHud();
    this.time.delayedCall(80, () => {
        if (this.scene) this.scene.restart();
    });
    return;
}
```

Khối này nằm trong `aiUpdate()`, được gọi từ `update()` — vòng lặp chạy **mỗi khung hình** của Phaser. `gameOver()` có gọi `this.physics.pause()`, nhưng tạm dừng vật lý không hề tạm dừng vòng lặp update của Scene, đó là hai khái niệm hoàn toàn tách biệt trong Phaser. Từ lúc `state` chuyển sang `"gameover"` tới lúc `delayedCall(80, ...)` thực sự kích hoạt restart — khoảng 5 khung hình ở 60fps — Scene vẫn gọi `aiUpdate()` đều đặn mỗi khung hình, và khối code trên không có gì chặn nó chạy lại.

Hệ quả: một lần chim chết thật có thể bị đếm thành 5 episode, epsilon giảm nhanh hơn 5 lần so với thiết kế, và tệ hơn — 5 lệnh `delayedCall` riêng biệt được xếp hàng chờ gọi `scene.restart()`, dù chỉ có lệnh đầu tiên là còn ý nghĩa. Không có gì "trông sai" trên HUD cả — số episode vẫn tăng đều, chỉ là tăng nhanh hơn số lần chim thực sự va chạm, một sai lệch không có mốc so sánh nào để tự phát hiện ra bằng mắt thường.

Điều thú vị là `gameOver()` — hàm xử lý va chạm vật lý — đã có đúng dạng cờ chặn tái nhập cần thiết (`if (this.state === "gameover") return;`). Chỉ riêng khối xử lý hệ quả huấn luyện trong `aiUpdate()` là thiếu nó, dù cùng nằm trong một class, cùng kiểm tra cùng một biến `this.state`. Bài học rút ra không mới nhưng luôn đáng nhắc lại: bất kỳ khối code nào phản ứng với `if (state === X)` đều cần tự hỏi điều kiện đó có được đảm bảo chỉ đúng trong đúng một khung hình hay không — nếu không, nó cần cờ chặn riêng, không thể ngầm giả định "chắc chỉ chạy một lần".

Phần thuật toán học, xét riêng, hoàn toàn đúng đắn — Q-value cập nhật đúng công thức, epsilon-greedy đúng chiến lược, trạng thái rời rạc hoá hợp lý. Bug nằm ở đúng lớp ranh giới dễ bị bỏ sót nhất: nơi vòng lặp huấn luyện gặp vòng lặp render, chỗ mà cả hai phía đều "đúng" khi xét riêng lẻ, chỉ sai khi chạy chồng lên nhau nhiều lần hơn dự tính.
