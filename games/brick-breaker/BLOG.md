# Đập Gạch: viên gạch hai máu trả công hậu hĩnh hơn dự tính

Đập Gạch là game thứ hai trong danh sách "Brick Game cầm tay" mình viết, ngay sau Tetris. Về cơ chế, nó là một trong những thể loại lâu đời và đơn giản nhất của lịch sử game: một thanh đỡ, một quả bóng, một lưới gạch, không có gì để phát minh lại. Nhưng chính vì "không có gì để phát minh lại" mà mọi quyết định nhỏ — gạch cứng nên cho bao nhiêu điểm, một khung hình được phép xử lý bao nhiêu va chạm — lại dễ bị lướt qua nhanh. Và một trong những quyết định lướt qua đó hoá ra tạo ra một quy tắc điểm số không hề chủ đích: gạch hai máu trả công nhiều hơn 50% so với hai viên gạch một máu cộng lại.

Game này kế thừa gần như nguyên vẹn bộ khung vật lý va chạm hình chữ nhật đã dùng ở Rapid Roll — kỹ thuật "quét khoảng đi qua" để không bỏ lọt va chạm ở tốc độ cao. Điểm khác biệt là ở đây có một lưới đối tượng tĩnh (gạch) thay vì lưới đối tượng động (sàn), và bóng cần phản xạ đúng hướng tuỳ theo va chạm từ cạnh nào của viên gạch. Cách xác định trục nảy dùng đúng kỹ thuật "điểm gần nhất trên hình chữ nhật" đã áp dụng cho va chạm tường-quả bóng ở Rapid Roll, nhưng lần này phải quyết định trục nảy thay vì trục đã biết trước, vì gạch có thể bị chạm từ bất kỳ cạnh nào trong 4 cạnh:

```javascript
const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
const dx = ball.x - closestX;
const dy = ball.y - closestY;
if (dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS) {
    if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx = -ball.vx;   // va chạm cạnh trái/phải
    } else {
        ball.vy = -ball.vy;   // va chạm cạnh trên/dưới
    }
}
```

So sánh độ lớn `|dx|` và `|dy|` cho biết bóng đang lệch nhiều hơn theo trục nào so với điểm gần nhất trên viên gạch — trục lệch nhiều hơn chính là trục cần đảo vận tốc. Đây là một xấp xỉ, không phải giải chính xác góc va chạm hình học, nhưng đơn giản, chạy nhanh, và đúng trong tuyệt đại đa số tình huống thực tế của Breakout. Ở phía thanh đỡ, góc nảy phụ thuộc vị trí chạm — chạm rìa nảy chéo, chạm giữa nảy gần thẳng đứng — cho người chơi khả năng "điều hướng" quả bóng dù bản thân bóng không có input trực tiếp nào khác ngoài việc di chuyển thanh đỡ:

```javascript
const hitPos = clamp((ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2), -1, 1);
const angle = hitPos * BALL_MAX_BOUNCE_ANGLE - Math.PI / 2;
```

`hitPos` chuẩn hoá về khoảng [-1, 1] tuỳ vị trí bóng chạm lệch bao xa khỏi tâm thanh đỡ, nhân với góc nảy tối đa cho phép rồi cộng offset -90° (thẳng lên). Đây là cơ chế kinh điển của cả thể loại, nhưng viết ra bằng tay lần đầu vẫn thấy khá thoả mãn khi thấy nó hoạt động đúng ngay từ lần thử đầu tiên.

Điều mình không ngờ tới lại nằm ở chỗ tưởng như đơn giản nhất: cộng điểm. Gạch cứng (2 máu) đổi độ mờ sau lần va chạm đầu để báo hiệu "còn một máu nữa", và mỗi lần trúng đều cộng điểm:

```javascript
brick.hp -= 1;
if (brick.hp <= 0) {
    brick.alive = false;
    score += brick.score;                      // phá xong: full điểm
} else {
    score += Math.floor(brick.score / 2);       // mới trúng lần 1: nửa điểm
}
```

Phát hiện này đến khi mình đọc lại đoạn code này để viết bài, không phải trong lúc chơi — vì chênh lệch điểm số không đủ rõ ràng để nhận ra bằng cảm giác trong một ván chơi bình thường. Truy theo con số cụ thể: với một viên gạch hàng đầu (`brick.score = 60` ở cấp 1), gạch một máu khi bị phá cho đúng 60 điểm. Gạch cứng cùng hàng, khi bị phá hoàn toàn qua hai lần va chạm, cho: lần 1 — `Math.floor(60/2) = 30` điểm (chưa phá, chỉ trúng), lần 2 — phá xong, cộng thêm toàn bộ 60 điểm, không phải phần còn lại. Tổng cộng `30 + 60 = 90` điểm, gấp 1.5 lần so với một viên gạch thường cùng giá trị, dù chỉ tốn thêm đúng một lần va chạm bóng.

Đây có phải bug thật sự không? Về mặt "có làm game vỡ không" thì không — game vẫn chạy đúng, điểm số không âm, không tràn số. Nhưng xét ý đồ thiết kế, nhiều khả năng ban đầu là "điểm cho lần trúng cuối cùng nên là phần còn lại, không phải toàn bộ" — nếu vậy công thức đúng phải chia `brick.score` làm hai phần cộng lại vừa đúng bằng giá trị gốc. Cách viết hiện tại vô tình biến "độ bền cao hơn" thành "phần thưởng cao hơn không cân xứng" — gạch cứng vừa khó phá hơn vừa lời hơn về điểm, một sự trùng hợp có lợi cho người chơi nhưng không rõ có chủ đích hay không. Mình chưa sửa trong bản hiện tại, vì mức chênh lệch (thêm 50% điểm cho một viên gạch trong số 48 viên mỗi lưới) không đủ lớn để phá vỡ cân bằng tổng thể, và về trải nghiệm, "gạch cứng đáng giá hơn" không hẳn là điều tệ đối với người chơi.

Điều rút ra ở đây khá cụ thể: công thức tính điểm theo từng sự kiện riêng lẻ — mỗi lần va chạm cộng điểm độc lập — rất dễ vô tình cộng dồn thành một tổng khác với điều đáng lẽ nên là "điểm cho việc phá được viên gạch", nếu không tính tổng lại bằng tay. Đây là lớp bug, hay ít nhất là điều-không-chủ-đích, chỉ lộ ra khi làm phép cộng cụ thể trên giấy, không lộ ra khi đọc code theo từng dòng riêng lẻ — mỗi dòng đều đúng theo đúng nghĩa nó làm chính xác điều nó viết ra, chỉ là tổng của chúng không khớp trực giác ban đầu.

Một điều nữa mình để ý khi đọc lại: va chạm thanh đỡ chỉ so vị trí tức thời ở cuối khung hình, không có "quét khoảng đi qua" như va chạm sàn ở Rapid Roll. Ở tốc độ bóng hiện tại, bóng vẫn di chuyển chậm hơn nhiều so với bề dày dải va chạm hiệu dụng, nên chưa từng quan sát được hiện tượng bóng xuyên qua thanh đỡ trong thực tế — nhưng đây là một biên an toàn đang thu hẹp dần mỗi khi tốc độ bóng tối đa tăng lên qua các lần cân bằng lại độ khó sau này, không phải một đảm bảo tuyệt đối.

Đập Gạch là bằng chứng rằng một thể loại "đã giải quyết xong từ thập niên 1970" vẫn có thể giấu một điều thú vị nếu nhìn đủ kỹ — không phải trong vật lý nảy (thứ đã đúng ngay từ đầu), mà trong cách những con số điểm nhỏ cộng dồn qua nhiều sự kiện rời rạc có thể tạo ra một kết quả tổng không ai chủ đích viết ra. Bug này vô hại và thậm chí có lợi cho người chơi — nhưng nó là lời nhắc rằng "mỗi dòng đúng" không tự động đảm bảo "tổng thể đúng như dự tính", đặc biệt với bất kỳ hệ thống nào cộng dồn giá trị qua nhiều lần gọi khác nhau.
