# Bóng Rổ: tấm bảng chỉ đỡ được bóng bay tới từ một phía

Tấm bảng rổ trong game này là một hình chữ nhật mỏng 4px, dựng đứng ngay sau vòng rổ. Với mọi cú ném bình thường — bóng bay từ góc dưới-trái lên trên-phải, dội bảng, rơi vào rổ — nó hoạt động hoàn hảo, mượt như game gốc. Nhưng ngồi đọc lại code sau khi đã xong game, dựng lại đúng toạ độ trên bàn cờ rộng 360px, mình phát hiện ra tấm bảng đó không hề chiếm trọn khoảng trống từ mép nó tới tường phải — còn một khoảng hở khá rộng phía sau. Và điều kiện code kiểm tra va chạm chỉ được viết cho đúng một hướng bay, hướng bóng đang tiến *tới* bảng, không phải hướng nó bay *ra* từ phía sau.

Bóng Rổ là game thứ ba trong loạt "Brick Game" mình làm, sau Tetris và Đập Gạch. Về cơ chế điều khiển, nó quay lại dùng đúng kiểu kéo-ngắm-thả đã dùng cho Pocket Carrom — kéo từ quả bóng ra xa để chọn hướng và lực, thả tay để ném — nhưng khác với Pocket Carrom (nơi một cú bắn có thể ảnh hưởng nhiều quân cùng lúc nên tách thành hai bước ngắm rồi bắn), ở đây mình giữ bắn-ngay-khi-thả vì một cú ném rổ chỉ xảy ra dứt khoát một lần mỗi lượt, không cần chỉnh lại giữa chừng.

Kỹ thuật mình thích nhất trong game này là cách phát hiện "vào rổ", tái sử dụng đúng ý tưởng quét-khoảng-đi-qua đã dùng cho va chạm sàn ở Rapid Roll: không so vị trí tức thời, mà so xem bóng có vượt qua đường ngang của vòng rổ giữa hai khung hình liên tiếp hay không.

```javascript
const crossedDown = ball.prevY < HOOP_Y && ball.y >= HOOP_Y;
if (crossedDown && ball.vy > 0 && Math.abs(ball.x - HOOP_X) < scoreZoneHalf) {
    ball.scored = true;
    ...
}
```

Cách này tránh được trường hợp bóng "nằm sẵn" đúng tại `y === HOOP_Y` mà không thực sự đi qua nó theo chiều nào — nếu chỉ so `ball.y === HOOP_Y`, một khung hình có `dt` lớn bất thường hoàn toàn có thể nhảy cóc qua đúng giá trị đó mà không bao giờ khớp. Vòng rổ bản thân nó cũng không phải một hình tròn duy nhất mà là hai cọc nhỏ đặt cách nhau một khoảng cố định, cộng một "vùng tính điểm" ảo hẹp hơn khoảng cách giữa hai cọc một chút, để bóng phải đi lọt qua phần lớn bề rộng vòng mới được tính, không chỉ chạm mép.

Va chạm với hai cọc viền rổ dùng đúng công thức xung lượng tròn-tròn đã viết cho quân cờ carrom, chỉ đổi hệ số đàn hồi cho phù hợp cảm giác "bật khỏi viền sắt":

```javascript
function bounceOffPost(postX, postY) {
    const dx = ball.x - postX;
    const dy = ball.y - postY;
    const d = Math.hypot(dx, dy) || 0.0001;
    const minDist = BALL_RADIUS + RIM_POST_RADIUS;
    if (d >= minDist) return false;
    const nx = dx / d;
    const ny = dy / d;
    ball.x = postX + nx * minDist;
    ball.y = postY + ny * minDist;
    const velAlongNormal = ball.vx * nx + ball.vy * ny;
    ball.vx -= (1 + RIM_RESTITUTION) * velAlongNormal * nx;
    ball.vy -= (1 + RIM_RESTITUTION) * velAlongNormal * ny;
    ball.touchedRim = true;
    return true;
}
```

Tái sử dụng đúng kỹ thuật đã kiểm chứng ở game trước giúp phần lớn vật lý viết đúng ngay từ lần đầu. Bug duy nhất mình tìm được nằm chính xác ở phần logic hoàn toàn mới của game này — tấm bảng, thứ chưa từng xuất hiện ở Pocket Carrom hay Rapid Roll:

```javascript
if (bdx * bdx + bdy * bdy <= BALL_RADIUS * BALL_RADIUS && ball.vx > 0) {
    ball.x = BACKBOARD_X - BALL_RADIUS;
    ball.vx = -Math.abs(ball.vx) * BACKBOARD_RESTITUTION;
    ball.touchedRim = true;
}
```

Điều kiện `ball.vx > 0` — bóng đang bay sang phải, tức đang tiến về phía bảng từ hướng ném thông thường — là bắt buộc để kích hoạt va chạm. Đúng cho tình huống thường gặp nhất: ném chéo từ dưới-trái lên trên-phải, dội bảng, rơi vào rổ. Nhưng dựng lại toạ độ cụ thể: `BACKBOARD_X = HOOP_X + RIM_WIDTH/2 + 8 = 284`, bảng dày 4px nên kết thúc ở `x = 288`. Tường phải nằm ở `x = 360` — một khoảng hở 72px giữa mép bảng và tường, đủ rộng để bóng lọt qua sau khi bật khỏi tường phải rồi bay ngược trở lại đúng vào dải toạ độ của bảng từ phía sau. Lúc đó `ball.vx > 0` là `false`, toàn bộ khối kiểm tra va chạm bảng bị bỏ qua — bóng xuyên thẳng qua tấm bảng dày 4px như thể nó không tồn tại.

Mình chưa sửa bug này. Để bóng bật ra tường phải rồi bay ngược đúng vào dải hẹp phía sau bảng đòi hỏi một góc ném và lực khá đặc thù — trong lúc chơi thử thông thường (ném từ góc dưới-trái, quỹ đạo tự nhiên hướng về vòng rổ) tình huống này gần như không tự nhiên xảy ra. Nhưng nó là một lời nhắc rõ ràng: một điều kiện va chạm viết cho trường hợp phổ biến nhất rất dễ bỏ sót trường hợp hiếm khi hình học của bàn chơi vô tình để hở một đường vòng phía sau vật cản. Cách kiểm tra chắc chắn hơn là không lọc theo hướng vận tốc mà chỉ dựa thuần vào việc bóng có đang chồng lấn hình học với bảng hay không — bảng nào cũng nên chặn bóng từ mọi phía nó tồn tại, trừ khi có lý do thiết kế rõ ràng để chỉ chặn một chiều.

Bóng Rổ, xét chung, là một ví dụ khá dễ chịu về việc tái sử dụng kỹ thuật đã kiểm chứng: quét-khoảng-đi-qua từ Rapid Roll, xung lượng tròn-tròn từ Pocket Carrom, cả hai đều chạy đúng ngay từ lần đầu. Rủi ro cao nhất luôn nằm ở phần code mới toanh, chưa được rèn qua va chạm thực tế nào — ở đây là một tấm bảng chỉ được thiết kế để nhìn từ một phía, trong khi hình học bàn chơi lại vô tình để hở một đường vòng ra sau nó.
