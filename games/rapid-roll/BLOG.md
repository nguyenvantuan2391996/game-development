# Rapid Roll: quả bóng thua ngay ở cú nảy đầu tiên, trước khi người chơi kịp chạm phím

Bug đáng nhớ nhất của game này không phải thứ mình tự phát hiện trong lúc chơi thử — nó bị bắt lại sau đó, và dấu vết duy nhất còn lại trong code bây giờ là một hằng số tên `DEATH_CHECK_MIN_DEPTH` kèm mấy dòng comment giải thích tỉ mỉ lý do nó tồn tại. Không có commit message kịch tính, không có story kể lại buổi tối debug — chỉ có đúng một dòng `if` được thêm một điều kiện, và toán học đứng sau nó đủ rõ ràng để tự kể lại chuyện gì đã xảy ra.

Rapid Roll là bản clone của trò chơi "quả bóng rơi né sàn" nổi tiếng trên các máy Nokia đời cũ, ra đời ngay sau Space Impact trong cùng một loạt game "máy Nokia đen trắng ngày xưa". Nếu Space Impact là bài toán về không gian (né đạn theo 2 trục), Rapid Roll là bài toán hoàn toàn khác: quả bóng chỉ rơi theo trục Y dưới trọng lực thật, người chơi chỉ điều khiển trục X, và cái quyết định độ khó không phải kẻ địch mà là camera — màn hình tự cuộn xuống ngày một nhanh, quả bóng nào nảy tại chỗ quá lâu sẽ bị "bỏ lại phía trên" và thua cuộc. Cơ chế lõi này — camera đuổi theo người chơi thay vì người chơi đuổi theo camera — là phần khó nghĩ nhất trong toàn bộ game, và cũng chính là nơi bug xảy ra.

Phần thiết kế mình thích nhất là cách camera được mô hình hoá — không phải một biến "theo dõi vị trí bóng" đơn thuần, mà là giá trị lớn nhất giữa hai lực kéo ngược chiều nhau:

```javascript
const scrollSpeed = Math.min(SCROLL_SPEED_MAX, BASE_SCROLL_SPEED + maxDepth * SCROLL_SPEED_PER_DEPTH);
const followTarget = ball.worldY - GAME_HEIGHT * FOLLOW_LINE_RATIO;
camera.y = Math.max(camera.y + scrollSpeed * dt, followTarget);
```

Vế thứ nhất (`camera.y + scrollSpeed * dt`) là áp lực bắt buộc: camera luôn trôi xuống với tốc độ tối thiểu, bất kể bóng đang làm gì — đây chính là nguồn tạo áp lực thời gian của cả game. Vế thứ hai (`followTarget`) là một cái trần an toàn: nếu bóng rơi nhanh hơn tốc độ cuộn tối thiểu, camera sẽ nhảy vọt theo kịp ngay lập tức để bóng không bao giờ rơi khỏi đáy màn hình. `Math.max` của hai vế này là toàn bộ "linh hồn" độ khó của game — không cần thêm bất kỳ logic địch hay va chạm phức tạp nào khác.

Thử nghiệm đầu tiên của mình cho công thức này lại khác hẳn: cho camera bám chặt bóng theo một offset cố định. Chơi thử ngay thấy sai — như vậy sẽ không có áp lực gì, người chơi có thể đứng yên nảy tại chỗ vĩnh viễn mà không thua. Phải tách rõ hai khái niệm "camera trôi vì thời gian trôi" và "camera trôi vì bóng đã đi xa" thành hai phép tính riêng rồi lấy giá trị lớn hơn, độ khó mới thực sự đến từ thời gian, không phải từ vị trí bóng.

Va chạm giữa bóng và sàn cũng có một chi tiết đáng nói: dùng "quét khoảng đi qua" thay vì so sánh vị trí tức thời, vì bóng có thể rơi nhanh tới mức bỏ qua hẳn một sàn mỏng 12px giữa hai khung hình nếu chỉ so `ball.worldY === platform.worldY`:

```javascript
const ballBottomPrev = prevY + BALL_RADIUS;
const ballBottomNew = ball.worldY + BALL_RADIUS;
if (ballBottomPrev <= p.worldY && ballBottomNew >= p.worldY && ...) {
    ball.worldY = p.worldY - BALL_RADIUS;
    ball.vy = -BOUNCE_VELOCITY;
}
```

So sánh "đáy bóng ở khung trước có nằm trên sàn không, đáy bóng ở khung này có nằm dưới hoặc bằng sàn không" bắt được cả trường hợp bóng đi xuyên qua sàn trong một khung hình dài, ví dụ máy giật lag khiến `dt` lớn bất thường.

Nhưng bug thú vị nhất lại nằm ở đúng khung hình đầu tiên của mỗi ván chơi. Hiện tượng: ván chơi kết thúc gần như ngay lập tức sau khi bấm Bắt đầu — bóng vừa nảy lên từ sàn đầu tiên đã bị chấm là "bị bỏ lại phía trên", dù người chơi chưa hề có cơ hội di chuyển sai. Truy ngược lại bằng đúng con số: bóng bắt đầu ở `worldY = 40`, camera bắt đầu ở `camera.y = 0`, sàn đầu tiên đặt tại `worldY = 110`. Ngay khi bóng chạm sàn này và nảy lên với `BOUNCE_VELOCITY = 480` dưới `GRAVITY = 900`, độ cao tối đa đạt được là `v² / (2g) = 480² / 1800 ≈ 128` đơn vị world phía trên điểm nảy — tức bóng có thể lên tới `worldY ≈ 110 − 12 − 128 = −30`. Trong khi đó, ở đúng thời điểm đó `camera.y` gần như vẫn còn bằng 0, vì `followTarget` lúc này rất âm nên không kéo camera lên được, còn vế "trôi bắt buộc" mới chỉ tích luỹ được vài pixel kể từ lúc bắt đầu. `screenY = ball.worldY − camera.y ≈ −30`, trong khi ngưỡng thua là `screenY < −BALL_RADIUS × 2 = −24`. `−30 < −24` — đúng điều kiện thua, dù đây chỉ là cú nảy đầu tiên hoàn toàn bình thường.

Cách mình sửa là thêm một hằng số `DEATH_CHECK_MIN_DEPTH = 220` chặn điều kiện thua bằng nó:

```javascript
if (maxDepth > DEATH_CHECK_MIN_DEPTH && screenY < -BALL_RADIUS * 2) {
    triggerGameOver("Bạn đã bị bỏ lại phía sau!");
    return;
}
```

Bỏ qua hoàn toàn việc kiểm tra "bị bỏ lại phía trên" cho tới khi bóng đã đi được ít nhất 220 đơn vị độ sâu — đủ để camera có thời gian rời khỏi trạng thái khởi tạo `y = 0` và bước vào chế độ đuổi theo ổn định, nơi công thức `Math.max` mới thực sự phản ánh đúng ý đồ thiết kế. Điều rút ra ở đây khá hay: một công thức đúng về mặt toán học ở trạng thái ổn định hoàn toàn có thể sai ở đúng vài khung hình đầu tiên, khi các biến chưa kịp "khởi động" tới giá trị mà công thức đó ngầm giả định. `camera.y = Math.max(...)` không sai ở bất kỳ đâu — nó chỉ đơn giản chưa có đủ thời gian trôi để vế "trôi bắt buộc" bắt kịp thực tế, và bug chỉ lộ ra ở đúng khung hình đầu tiên của mỗi ván, một cửa sổ thời gian cực ngắn mà lần nào test cũng vô tình đi qua chứ không cách nào né được. Bug ở "khung hình đầu tiên" là loại bug dễ bị bỏ sót nhất khi test bằng cách chơi thử nhiều lần, vì trực giác của người test luôn tập trung vào gameplay ở giữa và cuối ván.

`DEATH_CHECK_MIN_DEPTH` là một miếng vá thực dụng chứ không phải một lời giải triệt để — nó có tác dụng, nhưng bản chất là "trì hoãn" vấn đề thay vì loại bỏ nguyên nhân gốc là camera chưa khởi động kịp. Một cách sửa "tự nhiên" hơn có lẽ là thêm khoảng đệm bất tử theo thời gian (giống Space Impact có bất tử 1.2 giây sau khi mất mạng) thay vì chặn theo độ sâu — vì bug gốc vốn dĩ là một vấn đề về thời gian khởi động, không phải về không gian. Với con số 220 chọn hơi tuỳ ý, ai đó chỉnh `BOUNCE_VELOCITY` hay `GRAVITY` sau này rất có thể cần tính lại con số đó từ đầu.

Rapid Roll chứng minh một điều ngược trực giác: game càng ít cơ chế, càng dễ có một góc khuất toán học không ai để ý — vì có ít chỗ để nhìn, người viết code (và người test) đều mặc định "chắc không có gì phức tạp ở đây đâu". Bug thua-ngay-lập-tức này không nằm ở một vòng lặp phức tạp hay một điều kiện va chạm rắc rối, mà nằm ở đúng khoảnh khắc hai biến số (`camera.y` và `ball.worldY`) chưa kịp đồng bộ với giả định ngầm của công thức tính chúng. Một hằng số, vài dòng comment, và bug biến mất — nhưng cái thú vị hơn cả là chính commit thêm cái hằng số đó đã tự để lại đủ dấu vết để, dù không có mặt lúc nó xảy ra, vẫn dựng lại được chính xác toán học đằng sau.
