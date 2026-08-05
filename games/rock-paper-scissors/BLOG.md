# Oẳn Tù Tì: một AI học thói quen của bạn, và một điểm hoà luôn nghiêng về "Búa"

Phiên bản đầu tiên của game này không hề có AI. Nó có một sảnh chờ chọn phòng, một API giả lập bên thứ ba đứng sau, và một màn chơi hoàn toàn không có logic JavaScript nào — toàn bộ "trò chơi" chỉ là một trick CSS dùng thuộc tính `:checked`, thắng thua phụ thuộc vào phản xạ và may rủi nhiều hơn là việc thực sự chọn một nước đi. Bản hiện tại không còn gì từ đó — sảnh chờ bị xoá sạch vì màn chơi phía sau chưa từng thực sự dùng dữ liệu phòng đã tham gia — thay vào đó là một AI đối thủ thực sự học thói quen người chơi bằng n-gram và chuỗi Markov.

Cái khó khi làm Oẳn Tù Tì không nằm ở luật chơi — chỉ có ba nước, một bảng tra cứu ai thắng ai — mà nằm ở việc luật đơn giản tới mức không còn gì để làm phong phú thêm về gameplay. Một AI chơi ngẫu nhiên hoàn toàn (33% mỗi nước) sẽ khiến trò chơi vô nghĩa sau vài ván, chẳng có gì để học hay cải thiện. Vậy nên toàn bộ chiều sâu phải chuyển sang đối thủ: một AI dự đoán nước đi tiếp theo của người chơi dựa trên lịch sử, rồi luôn chơi đúng nước khắc chế dự đoán đó.

Phần thiết kế trung tâm là một chuỗi "lùi dần" (backoff) kinh điển trong mô hình n-gram — thử bậc cụ thể nhất trước, không đủ bằng chứng thì lùi về bậc tổng quát hơn:

```javascript
predictNextPlayerMove() {
    for (const order of NGRAM_ORDERS) {
        if (this.history.length < order) continue;
        const seq = this.history.slice(this.history.length - order);
        const counts = this.ngramTables[order][this.key(seq)];
        if (!counts) continue;

        const total = counts.rock + counts.paper + counts.scissors;
        if (total < NGRAM_MIN_EVIDENCE) continue;

        let best = MOVES[0];
        MOVES.forEach((m) => {
            if (counts[m] > counts[best]) best = m;
        });
        this.lastOrderUsed = order;
        this.lastConfidence = counts[best] / total;
        return best;
    }

    this.lastOrderUsed = 0;
    this.lastConfidence = 1 / 3;
    return MOVES[Math.floor(Math.random() * MOVES.length)];
}
```

`NGRAM_ORDERS` là `[3, 2, 1]`: trước tiên AI thử tra chuỗi 3 nước gần nhất của người chơi trong bảng học được, không đủ bằng chứng (ít hơn `NGRAM_MIN_EVIDENCE = 2` lần quan sát) thì lùi về chuỗi 2 nước, rồi cuối cùng về Markov bậc 1 (chỉ nước gần nhất). Không bậc nào đủ dữ liệu thì đoán ngẫu nhiên đều. Con người thường chơi theo thói quen chuỗi dài hơn một bước đơn lẻ — kiểu "sau khi thắng thì đổi nước", hay "ra Búa hai lần liên tiếp thì lần ba đổi khác" — nên bậc càng cao càng bắt được mẫu hình tinh vi hơn, miễn là đã có đủ dữ liệu để tin.

Một quyết định thiết kế mình khá tự hào: AI không bao giờ thêm nhiễu ngẫu nhiên lên trên một dự đoán đã đủ tự tin, để giả vờ "đôi khi nương tay cho công bằng". Nó chơi thuần theo dữ liệu học được. Người chơi hoàn toàn ngẫu nhiên sẽ tự nhiên đẩy AI về chế độ đoán ngẫu nhiên (không mẫu hình nào tích luỹ đủ bằng chứng) — đó là hành vi đúng của một bộ dự đoán dựa trên mẫu hình, không phải lỗi.

Nhưng chính sự minh bạch tuyệt đối đó — không có lớp nhiễu ngẫu nhiên nào để tình cờ che bớt sai sót — lại khiến một thiên vị nhỏ trong logic lộ rõ khi mình đọc lại đoạn chọn "nước đi tần suất cao nhất" ở trên để viết bài này. Điều kiện so sánh dùng `>` (lớn hơn nghiêm ngặt), không phải `>=`. Nếu dữ liệu học được có hai (hoặc cả ba) nước đi hoà tần suất — hoàn toàn có thể xảy ra sớm trong quá trình học, khi `NGRAM_MIN_EVIDENCE` chỉ là 2 — vòng lặp trên luôn chọn nước xuất hiện sớm nhất trong mảng `MOVES = ["rock", "paper", "scissors"]`, vì chỉ nước có tần suất *thực sự cao hơn* `best` hiện tại mới ghi đè được nó.

Nói cách khác: mọi tình huống hoà điểm trong dữ liệu học được đều bị AI diễn giải là "người chơi sắp ra Búa" — không bao giờ là Bao hay Kéo, dù cả ba đang hoà tần suất tuyệt đối. Và vì AI luôn chơi nước khắc chế dự đoán, một tình huống hoà sẽ luôn khiến nó ra Bao. Ảnh hưởng thực tế khá nhỏ — càng chơi nhiều, dữ liệu càng dày, khả năng hoà tần suất tuyệt đối giữa ba nước càng hiếm dần, và thiên vị chỉ thực sự có ý nghĩa ở giai đoạn đầu học, đúng lúc bản thân dự đoán cũng chưa đáng tin cậy mấy.

Cái mình thích ở bug này là nó minh hoạ một khuôn mẫu code cực kỳ phổ biến: "chọn phần tử giá trị cao nhất bằng vòng lặp so sánh `>`" luôn mang theo một giả định ngầm ít ai để ý — khi hoà, phần tử xuất hiện trước trong thứ tự duyệt sẽ thắng. Giả định đó vô hại trong phần lớn trường hợp, nhưng trở thành thiên vị có ý nghĩa thống kê khi thứ tự duyệt (ở đây là mảng `MOVES` cố định) không mang ý nghĩa ngẫu nhiên gì. Với một AI được quảng cáo là "học pattern công bằng", đây là loại thiên vị dễ bị bỏ sót nhất, vì nó không nằm ở dữ liệu học được — dữ liệu hoàn toàn khách quan — mà nằm ở chính logic diễn giải dữ liệu đó khi có nhiều hơn một câu trả lời đúng như nhau. Cách sửa cũng đơn giản: khi phát hiện nhiều nước đi cùng đạt tần suất cao nhất, chọn ngẫu nhiên trong số chúng thay vì luôn lấy phần tử đầu mảng.

Bài học rút ra không chỉ dừng ở dòng code cụ thể đó. Nó là lời nhắc rằng một AI càng minh bạch, càng "chơi thật" không giả vờ ngẫu nhiên, thì càng dễ để lộ những góc khuất nhỏ trong logic diễn giải — không phải vì AI kém đi, mà vì không còn lớp nhiễu nào để tình cờ che chúng lại.
