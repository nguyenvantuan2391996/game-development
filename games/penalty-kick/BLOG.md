# Đá Bóng: quả bóng bay thẳng như kẻ chỉ, và một trần độ khó không bao giờ chạm tới 100%

Trong lúc lên kế hoạch cho game này, mình từng hình dung một chi tiết cụ thể: quả bóng khi bay từ chấm phạt đền vào khung thành sẽ được nhấc lên theo một đường vòng cung nhẹ, mô phỏng độ cao thật của một cú sút, và tự thu nhỏ lại một chút để tạo cảm giác phối cảnh đang bay ra xa. Đọc lại đúng dòng code xử lý chuyển động của bóng ở bản hoàn chỉnh thì cả hai chi tiết đó đều không có mặt — bóng bay theo đúng một đường thẳng nội suy tuyến tính từ điểm sút tới điểm ngắm, không cong, không đổi kích thước. Đây là game thứ tư trong loạt Brick Game của mình, và câu chuyện đáng kể nhất ở game này không phải một con bug, mà là khoảng cách giữa một ý tưởng viết ra trong đầu lúc lên kế hoạch với những gì thật sự nằm trong file JavaScript cuối cùng.

Đá Bóng là biến thể "sút phạt đền" — khác hẳn về luật chơi so với những game trước trong cùng loạt. Không có vật lý trọng lực liên tục, không có va chạm nảy — mỗi lượt chỉ là một quyết định duy nhất (chạm vào đâu trong khung thành) rồi chờ xem thủ môn có đoán trúng hay không. Về bản chất, đây là game "gần với xác suất" nhất trong cả loạt, nơi cảm giác công bằng của trò chơi phụ thuộc hoàn toàn vào một công thức xác suất đơn giản, không phải vào vật lý hay phản xạ.

Quyết định thiết kế trung tâm của game nằm ở công thức xác suất đoán trúng của thủ môn — không cố định, mà tăng dần theo chuỗi bàn đã ghi:

```javascript
const guessChance = Math.min(MAX_GUESS_CHANCE, BASE_GUESS_CHANCE + streak * GUESS_CHANCE_STEP);
```

Với `BASE_GUESS_CHANCE = 0.26`, `GUESS_CHANCE_STEP = 0.03`, `MAX_GUESS_CHANCE = 0.68`, thủ môn bắt đầu chỉ đoán trúng 26% số lần, tăng 3% mỗi bàn liên tiếp, và đạt trần 68% sau đúng 14 bàn liên tiếp. Có một hệ quả toán học đáng chú ý mà thiết kế này cố tình chấp nhận: trần 68% nghĩa là thủ môn không bao giờ đoán trúng nhiều hơn 68% số lần, bất kể chuỗi bàn dài tới đâu — về lý thuyết, một chuỗi vô hạn hoàn toàn khả thi, chỉ là xác suất giảm dần theo cấp số nhân. Đây không phải sơ suất mà là lựa chọn có chủ đích: một trần độ khó không chạm 100% giữ cho streak luôn có thể tiếp tục, dù ngày càng khó, thay vì đặt ra một mốc "không thể vượt qua" cứng nhắc.

Cách thủ môn quyết định vùng bay cũng đáng nói, vì nó tách bạch rõ ràng hai việc khác nhau: "có đoán đúng hay không" và "nếu đoán sai thì chọn vùng nào":

```javascript
const guessChance = Math.min(MAX_GUESS_CHANCE, BASE_GUESS_CHANCE + streak * GUESS_CHANCE_STEP);
let diveIndex;
if (Math.random() < guessChance) {
    diveIndex = targetIndex;
} else {
    const others = [0, 1, 2, 3, 4, 5].filter((i) => i !== targetIndex);
    diveIndex = others[Math.floor(Math.random() * others.length)];
}
```

Thủ môn tung xác suất trước để quyết định "có đoán đúng hay không", chỉ khi không đoán đúng mới chọn ngẫu nhiên đều trong 5 vùng còn lại. Cách này tách bạch rõ ràng "kỹ năng của thủ môn" — một con số xác suất duy nhất — khỏi "thủ môn chọn vùng nào khi đoán sai", không cần một hệ thống quyết định phức tạp để tạo cảm giác đối thủ đang khôn dần lên theo chuỗi bàn.

Hoạt ảnh bóng bay và thủ môn bay người được đồng bộ bằng cùng một giá trị `t`, tính từ cùng một mốc thời gian cố định 550ms:

```javascript
if (phase === "animating") {
    animTimer += dtMs;
    const t = clamp(animTimer / KICK_DURATION_MS, 0, 1);
    const target = zoneCenter(kickTargetIndex);
    ball.x = lerp(ball.startX, target.x, t);
    ball.y = lerp(ball.startY, target.y, t);
    keeper.x = lerp(keeper.startX, keeper.targetX, t);
    keeper.y = lerp(keeper.startY, keeper.targetY, t);
    if (t >= 1) resolveKick();
}
```

Cả hai chuyển động đều là "từ điểm A tới điểm B trong đúng 550ms" — không cần một hệ vật lý riêng, chỉ một hàm `lerp` dùng chung, tính tại đúng `t` như nhau cho cả hai để đảm bảo chúng luôn đồng bộ về mặt thời gian. Không thể xảy ra tình huống thủ môn "xong" trước hay sau khi bóng tới, vì cả hai luôn tới đích ở đúng cùng một khung hình — thời điểm đó mới gọi `resolveKick()` để quyết định thắng thua.

Quay lại chuyện quỹ đạo bóng thẳng tuyệt đối — dòng code thực tế trong `updateWorld`:

```javascript
ball.x = lerp(ball.startX, target.x, t);
ball.y = lerp(ball.startY, target.y, t);
```

Không có bất kỳ điều chỉnh độ cao nào theo kiểu trừ đi một hàm sin để tạo hiệu ứng "nhấc lên rồi hạ xuống" — công thức thường thấy ở các game ném/sút bóng khác trong cùng repo, ví dụ quỹ đạo bóng rổ dùng trọng lực thật — và cũng không có phép co kích thước bóng theo tiến trình bay để mô phỏng phối cảnh xa dần. Cả hai ý tưởng này từng có mặt trong kế hoạch ban đầu nhưng không xuất hiện trong `drawBall()` của bản cuối cùng, nơi bóng luôn được vẽ với đúng bán kính cố định. Game vẫn chạy đúng, hoạt ảnh vẫn mượt, người chơi vẫn hiểu được bóng đang bay từ đâu tới đâu — chỉ là thiếu đi một lớp gia vị thị giác. Không có gì bị hỏng, chỉ là một phạm vi công việc bị cắt bớt trong quá trình viết, nhiều khả năng vì độ ưu tiên: một cú sút chỉ kéo dài 550ms, và ở tốc độ đó, khác biệt giữa "bay thẳng" và "bay có vòng cung nhẹ" khó nhận ra bằng mắt hơn nhiều so với một quỹ đạo kéo dài cả giây với độ cao rõ rệt.

Điều mình thấy thú vị khi tìm ra khoảng cách này là: không phải mọi chi tiết trong kế hoạch ban đầu đều thực sự cần thiết khi bắt tay vào viết, và việc một chi tiết "biến mất" giữa kế hoạch và bản hoàn chỉnh không tự động là dấu hiệu của sự cẩu thả. Nó có thể đơn giản là một đánh giá lại độ ưu tiên diễn ra tự nhiên trong lúc viết code, chỉ là không có gì ghi chép lại quyết định đó — khiến việc đọc lại code sau này là cách duy nhất để phát hiện ra khoảng cách đó tồn tại.

Có hai điều mình để ý là những lựa chọn có thể tranh luận, không hẳn sai nhưng đáng cân nhắc lại. Một là không có cách nào để người chơi biết trước xác suất đoán trúng hiện tại của thủ môn — `guessChance` là một con số nội bộ hoàn toàn ẩn, người chơi chỉ cảm nhận được "hình như thủ môn đang bắt được nhiều hơn" một cách mơ hồ qua trải nghiệm, không có chỉ báo trực quan nào trong HUD phản ánh con số đó đang tăng dần. Với một cơ chế mà toàn bộ độ khó nằm gọn trong đúng một con số, việc giấu hoàn toàn con số đó khỏi người chơi là một lựa chọn có thể tranh luận — lộ ra một phần có thể khiến game cảm thấy công bằng và minh bạch hơn. Hai là thủ môn không có "xu hướng" nào cả khi đoán sai — chọn vùng sai hoàn toàn ngẫu nhiên đều trong 5 vùng còn lại, đơn giản hơn để viết nhưng cũng khiến hành vi thủ môn hơi máy móc nếu chơi đủ lâu để nhận ra không có bất kỳ khuôn mẫu nào trong cách nó chọn sai.

Đá Bóng là game "mỏng" nhất về code trong cả loạt Brick Game của mình, và đúng như dự đoán, không có bug thực sự nào lộ ra khi đọc lại — thay vào đó, thứ lộ ra là một khoảng cách nhỏ giữa những gì từng được hình dung lúc lên kế hoạch và những gì thực sự tồn tại trong bản hoàn chỉnh. Không phải sai sót nào cũng ồn ào như một exception trong console — đôi khi nó chỉ là một câu "mình định làm cái này" lặng lẽ biến mất giữa lúc gõ code, và chỉ lộ ra khi có ai đó quay lại đọc với đúng câu hỏi: cái này có thật sự nằm trong code không, hay chỉ nằm trong kế hoạch?
