# Space Impact "màu": làm Nokia hoài niệm mà không được phép đen trắng

Yêu cầu gốc chỉ có một câu, kèm một cái link ảnh: "thêm game Space Impact trên nokia đen trắng ngày xưa (nhưng có màu nhé)". Đọc lần đầu, câu trong ngoặc mới là phần khó — không phải "làm game bắn máy bay kiểu Space Impact" (cái đó có hàng trăm bản clone làm rồi), mà là giữ đúng cảm giác màn hình LCD Nokia trong khi cố tình phá vỡ đúng đặc trưng nhất của nó: chỉ có một màu xanh lá đơn sắc. Mình còn chưa kịp mở file đầu tiên thì tin nhắn tiếp theo đã tới: "thêm game Rapid Roll", rồi "thêm game Pocket Carrom". Space Impact hoá ra là game đặt nền móng thẩm mỹ (và cả khung code) cho cả loạt game "Nokia hoài niệm" ra đời ngay sau nó trong cùng phiên làm việc.

Repo lúc đó đã có hơn chục game, phần lớn dùng chung một bộ khung: một thư mục riêng, `constants.js` tách hằng số, một file `*-main.js` bọc trong IIFE chạy vòng lặp `requestAnimationFrame`, trạng thái `ready/playing/gameover`, HUD bằng `div.hud-chip`. Việc đầu tiên mình làm không phải viết code mới, mà mở `pooyan-main.js` đọc lại từ đầu đến cuối để nắm đúng khuôn mẫu đó — nhờ vậy phần "hạ tầng" của Space Impact viết xong trong vài phút, dồn hết thời gian cho phần thật sự mới: di chuyển tự do 4 hướng và một hệ thống sprite pixel-art tự vẽ bằng canvas, vì "Nokia nhưng có màu" thì không có sẵn asset nào để tải về.

Quyết định thiết kế đáng nói nhất nằm ở `drawPixelGrid` — một hàm dùng chung để vẽ mọi sprite từ một mảng chuỗi ký tự, `"1"` là màu chính, `"2"` là màu phụ, `"."` là trong suốt:

```javascript
function drawPixelGrid(cx, cy, size, rows, colorFn) {
    const cols = rows[0].length;
    const cell = size / cols;
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols; c++) {
            const ch = rows[r][c];
            if (ch === ".") continue;
            ctx.fillStyle = colorFn(ch);
            const px = cx - size / 2 + c * cell;
            const py = cy - (rows.length * cell) / 2 + r * cell;
            ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(cell) + 0.5, Math.ceil(cell) + 0.5);
        }
    }
}
```

Đây là cách rẻ nhất để có được đúng cảm giác "8-bit dot-matrix" mà không cần một file ảnh nào — phi thuyền, drone, cruiser đều chỉ là một mảng chuỗi 5-9 ký tự đặt cạnh nhau trong code, chỉnh hình dạng bằng mắt ngay trong file JS. Cái giá phải trả là `cols` được suy ra từ độ dài chuỗi của đúng dòng đầu tiên (`rows[0].length`) — một giả định ngầm: nếu sau này ai đó sửa một sprite mà lỡ tay để một dòng ngắn/dài hơn các dòng còn lại (gõ thiếu một dấu `.` chẳng hạn), không có gì báo lỗi cả, cột chỉ đơn giản lệch âm thầm, sprite vẽ ra méo mó nhưng game vẫn chạy không văng lỗi console nào. Ba mảng sprite hiện tại đều đã được kiểm tra đều tay, nhưng bản thân hàm không có gì tự bảo vệ trước sai sót đó.

Phi thuyền được giới hạn không bay tự do khắp màn hình như bản Nokia gốc, mà chỉ trong 60% bề rộng bên trái:

```javascript
player.y = Math.max(PLAYER_SIZE / 2, Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, player.y));
player.x = Math.max(PLAYER_SIZE / 2, Math.min(playerMaxX, player.x));
```

`playerMaxX = GAME_WIDTH * PLAYER_MAX_X_RATIO` (0.6, tức 216px trên tổng 360px) — một quyết định có ý thức, không phải giới hạn kỹ thuật. Nó giữ lại cảm giác "hành lang bắn" quen thuộc của thể loại shoot 'em up (địch luôn xuất hiện từ bên phải, người chơi luôn ở bên trái): đủ chỗ né đạn theo cả 4 hướng, nhưng phi thuyền không bao giờ trôi dạt sang tận rìa phải nơi địch mới xuất hiện. Giới hạn không gian di chuyển hoá ra là một công cụ cân bằng độ khó rẻ tiền nhưng hiệu quả — không cần thêm logic AI hay địch mới, chỉ cần thu hẹp vùng né đạn là độ khó đã thay đổi rõ rệt.

Súng có 3 cấp, nhặt sao vàng để lên cấp, nhưng mỗi lần mất mạng thì tụt một bậc:

```javascript
function loseLife() {
    if (invulnerable) return;
    lives -= 1;
    if (lives <= 0) {
        triggerGameOver("Your ship has been destroyed!");
    } else {
        invulnerable = true;
        weaponLevel = Math.max(1, weaponLevel - 1);
        setTimeout(() => {
            invulnerable = false;
        }, 1200);
    }
}
```

Một dạng "rubber-band" nhẹ: người chơi giỏi tích luỹ được súng mạnh, nhưng mỗi sai lầm đều có giá, buộc phải nhặt sao lại từ đầu thay vì giữ cấp 3 xuyên suốt cả ván.

Đọc kỹ lại code để viết bài này (không phải trong lúc chơi thử — chênh lệch quá nhỏ để mắt thường nhận ra), mình phát hiện thiên thạch có thể trồi ra ngoài biên trên/dưới đúng một khung hình trước khi bật ngược lại:

```javascript
e.x -= e.speed * dt;
e.y += e.vy * dt;         // cập nhật vị trí trước
e.angle += e.spin * dt;
if (e.y < e.size / 2 || e.y > GAME_HEIGHT - e.size / 2) e.vy *= -1;  // rồi mới kiểm tra biên
```

Vị trí được cộng dồn trước, kiểm tra biên chạy sau — ở đúng khung hình chạm biên, thiên thạch đã di chuyển lố ra ngoài giới hạn trong khoảnh khắc đó, vận tốc chỉ đảo chiều để khung hình tiếp theo kéo nó về, nhưng bản thân vị trí ở khung hình chạm biên không hề bị kẹp lại vào trong. Độ lệch tối đa mỗi khung hình chỉ khoảng `ASTEROID_SPEED_MAX * dt ≈ 150 × 0.016 ≈ 2.4px`, nhỏ hơn nhiều so với kích thước 28px của thiên thạch, nên gần như không thể nhận ra khi chơi bình thường — mình chưa sửa vì ảnh hưởng thực tế quá nhỏ, nhưng "cập nhật vị trí rồi mới kiểm tra biên" là một thứ tự rất dễ viết nhầm tay, vì nó chạy đúng trong tuyệt đại đa số trường hợp, chỉ lộ sai số ở đúng khung hình chạm biên. Bất kỳ đối tượng bay tự do nào trong không gian 2D cũng nên tự hỏi: mình đang clamp vị trí, hay chỉ đảo vận tốc?

Một đánh đổi khác mình để nguyên có chủ đích: cruiser — loại địch nguy hiểm nhất vì bắn trả — chỉ ngắm thẳng vào vị trí người chơi tại đúng thời điểm bắn, không dự đoán hướng di chuyển. Nghĩa là chỉ cần liên tục di chuyển ngay sau khi thấy cruiser chuẩn bị bắn là gần như luôn né được, vì đạn bay tới đúng nơi người chơi đã từng đứng, không phải nơi sắp đứng. Đây là lựa chọn có ý thức để giữ độ khó vừa phải thay vì biến thành "bullet hell" khó né, nhưng cũng đồng nghĩa con địch mạnh nhất trong game sẽ mãi mãi dễ hơn nó có thể trở thành.

Space Impact không phải game phức tạp nhất trong đợt đó — chỉ một màn chơi, không boss, không nhiều cơ chế. Nhưng nó là game đặt ra bộ "ngôn ngữ hình ảnh" (lưới LCD phủ màu, sprite pixel tự vẽ bằng `drawPixelGrid`) mà mấy game viết ngay sau nó trong cùng phiên đều vay mượn lại ít nhiều. Cái thú vị nhất khi ngồi viết lại câu chuyện này không phải nhớ ra một sự cố kịch tính nào, mà là nhận ra — khi đọc code với con mắt "đi tìm bug" thay vì "đang viết mới" — có bao nhiêu chi tiết nhỏ từng trôi qua êm xuôi lúc code chạy đúng ngay lần đầu, chỉ lộ ra khi đọc lại với đúng câu hỏi.
