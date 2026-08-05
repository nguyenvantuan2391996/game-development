# Swing Copters: game "đứng yên" mượn nguyên một bug từ người anh em Flappy Bird

Mở `js/q-learning-agent.js` của Swing Copters cạnh phiên bản cùng tên trong thư mục Flappy Bird, chạy `diff` giữa hai file, và gần như toàn bộ giống hệt nhau — chỉ khác đúng một hàm: `getFlappyState` đổi tên và đổi công thức thành `getSwingState`, phần còn lại của class `QLearningAgent` (alpha, gamma, epsilon-greedy, cập nhật Q-value) không đổi một chữ. Đây là kiến trúc "chế độ AI Q-learning" mình xây một lần cho Flappy Bird rồi tái sử dụng có chủ đích cho game thứ hai. Và cùng với phần tái sử dụng đó, một bug mình từng ghi nhận ở Flappy Bird cũng đi theo, nguyên vẹn, sang đúng game này.

Swing Copters là "anh em song sinh" kỹ thuật của Flappy Bird — cùng dùng Phaser 3, cùng cấu trúc scene, cùng có chế độ AI Q-learning không được nhắc tới trong README. Nhưng về gameplay, nó đảo ngược hoàn toàn giả định cốt lõi của Flappy Bird: thay vì nhân vật cố định theo trục ngang và di chuyển theo trục dọc, ở đây nhân vật cố định theo trục *dọc* (toạ độ Y không bao giờ đổi) và chỉ di chuyển ngang, trong khi chướng ngại vật — các cặp thanh xà — trôi xuống từ trên. Về mặt hình ảnh, người chơi vẫn có cảm giác "bay lên xuyên qua các thanh xà", nhưng về mặt vật lý thì ngược lại hoàn toàn:

```javascript
// Swing Copters: nhân vật KHÔNG trọng lực, xà CÓ velocityY (trôi dọc xuống)
[leftBeam, rightBeam].forEach((beam) => {
    beam.body.setAllowGravity(false);
    beam.body.setImmovable(true);
    beam.body.setVelocityY(this.riseSpeed);   // xà tự trôi xuống, không phải nhân vật trôi lên
});
```

Cách làm này giữ vật lý đơn giản hơn nhiều so với việc mô phỏng một nhân vật "bay lên" thật (sẽ cần tính lại vị trí camera hoặc cuộn toàn bộ thế giới) — chỉ cần đúng một trục chuyển động cho chướng ngại vật là đủ tạo ra ảo giác mong muốn. Khi độ khó tăng (cứ mỗi 5 điểm), mình cập nhật lại vận tốc của *mọi* thanh xà đang tồn tại trên màn hình, không chỉ những xà sinh ra sau đó — để không có tình huống kỳ lạ nơi xà cũ trôi chậm hơn xà mới cùng lúc xuất hiện trên màn hình.

Phần thú vị nhất lại nằm ở chỗ mình không viết mới: kiến trúc AI. `sharedAgent`, `aiUpdate()`, toàn bộ vòng lặp huấn luyện được copy gần như nguyên xi từ Flappy Bird, chỉ thay hàm rời rạc hoá trạng thái cho phù hợp trục chuyển động đảo ngược. Và đúng như dự đoán, khối code xử lý episode khi game over cũng đi theo nguyên vẹn:

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

Đây chính là bug đã phân tích kỹ ở bài Flappy Bird: khối này nằm trong `aiUpdate()`, được gọi mỗi khung hình từ `update()` của Phaser. `physics.pause()` (gọi trong `gameOver()`) không hề ngăn vòng lặp update của Scene tiếp tục chạy — nên trong khoảng 80ms giữa lúc `state` chuyển thành `"gameover"` và lúc `scene.restart()` thực sự kích hoạt, khối trên bị gọi lại nhiều lần, không có cờ chặn tái nhập nào cản nó. Hậu quả: `episode` và `epsilon` có thể bị cập nhật vài lần cho cùng một cái chết, HUD vẫn tăng đều nên không có gì "trông sai" để phát hiện bằng mắt.

Điều mình thấy đáng chú ý hơn cả bản thân bug là cách nó lan truyền. Đây là bằng chứng cụ thể cho một rủi ro riêng của việc tái sử dụng code bằng sao chép, khác hẳn việc chia sẻ qua một module dùng chung thực sự: khi game thứ hai copy một khối logic từ game thứ nhất, nó copy *nguyên vẹn* cả những gì đúng lẫn những gì sai. Nếu `QLearningAgent` và phần khung huấn luyện được tách thành một file import chung, sửa bug ở Flappy Bird sẽ tự động sửa luôn cho Swing Copters. Với cách tổ chức hiện tại — mỗi game giữ một bản sao độc lập gần như toàn bộ file — sửa ở một nơi không lan sang nơi còn lại. Hai bug giống hệt nhau giờ tồn tại như hai vấn đề *riêng biệt*, cần hai lần sửa riêng biệt.

Một chi tiết nhỏ khác đáng nhắc: `handleInput()` (nhánh đang chơi) và `aiFlip()` chứa đúng ba dòng logic giống hệt nhau, không dùng chung một hàm:

```javascript
this.direction *= -1;
this.character.body.setVelocityX(this.direction * HORIZONTAL_SPEED);
this.tweens.add({ targets: this.character, angle: this.direction * 15, duration: 150 });
```

Vô hại về hành vi — cả hai chạy đúng — nhưng là một vi phạm DRY nhỏ mà rõ ràng. Nếu sau này cần chỉnh hành vi đảo hướng (thêm âm thanh, đổi công thức góc nghiêng), phải nhớ sửa đúng cả hai chỗ.

Bài học rút ra từ Swing Copters không nằm ở gameplay (đảo trục chuyển động là một cách rẻ và hiệu quả để biến một nền tảng có sẵn thành một game "mới"), mà ở đúng chỗ mình ít ngờ tới nhất: khi hai phần của một hệ thống đủ giống nhau về kiến trúc để đáng được sao chép, đó cũng chính là tín hiệu cho thấy chúng đủ giống nhau để đáng được trừu tượng hoá thành một thành phần dùng chung thật sự. Không làm điều đó — có thể vì áp lực thời gian, có thể vì mỗi game được viết độc lập không lường trước game thứ hai — là một đánh đổi có thật, không phải một mặc định miễn phí.
