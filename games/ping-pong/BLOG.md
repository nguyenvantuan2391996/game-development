# Bóng Bàn: thêm chế độ 2 người chơi vô tình đưa bàn phím vật lý quay trở lại

Toàn bộ game trong loạt "Brick Game" của mình được viết với một tiêu chí xuyên suốt: phải chơi được bằng ngón tay trên điện thoại, không chỉ bằng bàn phím. Space Impact có D-pad chạm, Rapid Roll có D-pad chạm, Đập Gạch có D-pad chạm — Bóng Bàn cũng vậy ngay từ bản đầu tiên, với vợt dưới do người chơi điều khiển và một AI đơn giản theo dõi bóng cầm vợt trên. Nhưng khi mình thêm chế độ "2 người chơi cùng bàn phím" vào sau đó, có một hệ quả không ai chủ đích tạo ra: chế độ đó, đúng theo bản chất của nó, không thể chơi được trên điện thoại.

Bóng Bàn là game cuối trong 5 game "Brick Game" (Tetris → Đập Gạch → Bóng Rổ → Đá Bóng → Bóng Bàn), và Pong nguyên bản mà nó phỏng theo vốn dĩ là một game hai người chơi, ra đời trước cả khái niệm "chơi với máy tính" trong ngành. Thêm lại chế độ 2 người vào sau gần như là điều tất yếu để game trọn vẹn đúng tinh thần gốc của nó — chọn chế độ ngay ở màn hình chính, Người 1 dùng mũi tên, Người 2 dùng A/D, cùng ngồi một máy.

Điểm mình thích nhất trong cách tích hợp chế độ mới là mức độ tối thiểu của thay đổi cần thiết. Toàn bộ vật lý bóng, va chạm vợt, tính điểm giữ nguyên 100% giữa hai chế độ, chỉ có nhánh input là khác nhau:

```javascript
if (mode === "2p") {
    if (keys.ArrowLeft) playerPaddle.x -= PLAYER_SPEED * dt;
    if (keys.ArrowRight) playerPaddle.x += PLAYER_SPEED * dt;
    if (keys.a || keys.A) cpuPaddle.x -= PLAYER_SPEED * dt;
    if (keys.d || keys.D) cpuPaddle.x += PLAYER_SPEED * dt;
} else {
    if (keys.ArrowLeft || keys.a || keys.A) playerPaddle.x -= PLAYER_SPEED * dt;
    if (keys.ArrowRight || keys.d || keys.D) playerPaddle.x += PLAYER_SPEED * dt;
    // ... AI theo dõi ball.x cho cpuPaddle ...
}
```

Ở chế độ đấu máy, A/D vẫn điều khiển vợt của người chơi, dùng chung với mũi tên — một kiểu điều khiển kép quen thuộc. Ở chế độ 2 người, hai bộ phím tách hẳn ra điều khiển hai vợt độc lập, cùng biến `keys[...]`, cùng cấu trúc `if`, chỉ khác cách gán vào vợt nào. Nhờ cách chia này, một bug vật lý bóng (nếu có) sẽ được sửa một lần cho cả hai chế độ, không cần đồng bộ hai bản logic riêng biệt.

Chỗ thú vị hơn cả lại không nằm ở code, mà lộ ra khi mình đọc lại toàn bộ luồng để viết bài này. Ở chế độ 2 người, D-pad chạm bị ẩn hoàn toàn, thay bằng một dòng chữ hướng dẫn:

```html
<div class="touch-controls" id="touch-controls">
    <div class="dpad dpad--horizontal">...</div>
</div>
<div class="two-player-note" id="two-player-note" hidden>
    Chế độ 2 người: Người 1 dùng ◀ ▶, Người 2 dùng phím A / D
</div>
```

```javascript
if (mode === "2p") {
    ...
    if (touchControls) touchControls.style.display = "none";
    if (twoPlayerNote) twoPlayerNote.hidden = false;
    ...
}
```

Về mặt kỹ thuật không có gì sai — không bug, không gì bị vỡ. Nhưng nó có nghĩa là chế độ 2 người, trên một chiếc điện thoại, hoàn toàn không chơi được: không có bàn phím vật lý, không có D-pad chạm thay thế, chỉ có một dòng chữ hướng dẫn dùng những phím không tồn tại trên màn hình cảm ứng. Đây là khoảng trống tồn tại xuyên suốt cả dự án — mọi game khác trong repo đều có phương án điều khiển chạm, nhưng tính năng 2-người-chung-bàn-phím lại tái lập chính xác giả định "người chơi có bàn phím vật lý" mà cả loạt game này sinh ra để phá bỏ.

Đây không phải một lỗi kỹ thuật để sửa bằng một dòng code — bản chất của "2 người dùng chung một bàn phím" vốn dĩ giả định có một bàn phím vật lý để dùng chung, không có bàn phím thì khái niệm đó không còn ý nghĩa gì để bàn tới nữa. Một tính năng có thể hoàn toàn đúng theo đúng phạm vi nó tự đặt ra (2 người, cùng bàn phím, cùng máy) nhưng vẫn tạo ra khoảng trống khi đặt cạnh một tiêu chí thiết kế rộng hơn của cả dự án. Không có bug cụ thể nào để trỏ vào và sửa — chỉ có một câu hỏi thiết kế chưa có lời giải: nếu muốn 2 người cùng chơi trên một điện thoại, cơ chế điều khiển cần được nghĩ lại hoàn toàn (ví dụ chia đôi màn hình thành hai vùng chạm trái/phải cho mỗi người), không chỉ đơn giản là ẩn D-pad và hiện dòng chữ hướng dẫn.

Một khoản nợ nhỏ khác mà mình để lại lúc code: biến `cpuPaddle` vẫn giữ nguyên tên dù ở chế độ 2 người nó không còn liên quan gì tới "máy" cả — nó là vợt của Người 2. Đọc dòng `if (keys.d || keys.D) cpuPaddle.x += PLAYER_SPEED * dt;` ở chế độ 2p, người đọc phải tự nhớ rằng trong ngữ cảnh này `cpuPaddle` thực ra là vợt người thật. Đổi tên thành `topPaddle` hay `opponentPaddle` sẽ trung lập và đúng ngữ nghĩa hơn ở cả hai chế độ, nhưng lúc đó mình chọn tái sử dụng biến có sẵn để đi nhanh hơn, đánh đổi lấy một khoản nợ đặt tên nhỏ.

Thêm chế độ 2 người vào Bóng Bàn là một quyết định gần như hiển nhiên, và phần lớn công sức kỹ thuật để làm việc đó diễn ra suôn sẻ, không phát sinh bug nào đáng kể. Điều thú vị hơn cả nằm ở một hệ quả không ai chủ đích tạo ra: một tiêu chí thiết kế xuyên suốt cả dự án ("chơi được trên điện thoại") và một tính năng đúng đắn trong phạm vi riêng của nó ("2 người dùng chung bàn phím") hoá ra xung khắc nhau ở đúng một điểm không thể dung hoà bằng cách chỉnh sửa nhỏ. Không phải mọi câu hỏi thiết kế đều có sẵn câu trả lời đúng chờ được tìm ra — có những câu hỏi chỉ đơn giản là chưa có lời giải.
