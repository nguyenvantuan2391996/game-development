# Oẳn Tù Tì: một AI học được thói quen của bạn, và một điểm hoà luôn nghiêng về phía "Búa"

## 1. Mở đầu

Phiên bản đầu tiên của game này không hề có AI. Nó có một sảnh chờ chọn phòng, một API giả lập bên thứ ba đứng sau, và một màn hình chơi hoàn toàn không có một dòng JavaScript logic nào — toàn bộ "trò chơi" chỉ là một trick CSS dùng thuộc tính `:checked`, nơi kết quả thắng-thua phụ thuộc vào phản xạ và may rủi nhiều hơn là vào việc thực sự "chọn" một nước đi. Bản game hiện tại không còn gì từ phiên bản đó — sảnh chờ bị xoá sạch, thay vào đó là một AI đối thủ thực sự học thói quen chơi của người dùng bằng n-gram và chuỗi Markov. Bài này kể về bản viết lại đó, và về một điểm hoà nhỏ trong chính thuật toán "học hỏi" ấy: khi hai nước đi hoà điểm bằng nhau trong dữ liệu học được, AI luôn nghiêng về đúng một phía, không bao giờ ngẫu nhiên.

## 2. Bối cảnh

Oẳn Tù Tì (Rock Paper Scissors) là một trong những game đơn giản nhất về luật chơi trong toàn bộ repo — chỉ có 3 nước đi, một bảng tra cứu ai thắng ai. Nhưng chính vì luật chơi đơn giản tới mức không còn gì để "làm phong phú" thêm về mặt gameplay, toàn bộ chiều sâu của game buộc phải chuyển sang một hướng khác: đối thủ. Một AI chơi ngẫu nhiên hoàn toàn (33% mỗi nước) sẽ khiến trò chơi vô nghĩa sau vài ván — không có gì để học, không có gì để cải thiện. AI dùng n-gram/Markov giải quyết đúng vấn đề đó: nó biến một trò chơi tưởng chừng thuần may rủi thành một trò chơi có thể *học được đối thủ đang học mình*, một dạng mèo vờn chuột hai chiều.

## 3. Mục tiêu sản phẩm

**Đã làm:**
- AI dự đoán nước đi tiếp theo của người chơi dựa trên lịch sử: tìm chuỗi 3 nước gần nhất, rồi 2 nước, đã từng gặp đủ bằng chứng (tối thiểu 2 lần xuất hiện trước đó); không đủ thì lùi về bảng Markov bậc 1 (nước gần nhất → nước tiếp theo); không có dữ liệu gì thì đoán ngẫu nhiên đều.
- AI luôn chơi đúng nước đi khắc chế nước nó dự đoán người chơi sẽ đi.
- Hiển thị "độ tự tin" của dự đoán (tỉ lệ phần trăm) và bậc n-gram đã dùng cho mỗi lượt, cho người chơi thấy AI đang "nghĩ" gì.
- Lưu toàn bộ lịch sử và bảng học vào `localStorage`, AI tiếp tục học xuyên suốt các lần mở lại trang, có nút "Xoá học & học lại".
- Bảng điểm thắng/thua/hoà, chuỗi thắng hiện tại và chuỗi thắng cao nhất từng đạt được.

**Sẽ KHÔNG làm:**
- Không thêm nhiễu ngẫu nhiên lên trên một dự đoán đã đủ tự tin — AI hoàn toàn xác định (deterministic) một khi đã có đủ bằng chứng, không giả vờ "đôi khi đoán sai cho công bằng".
- Không có sảnh chờ nhiều người chơi hay kết nối API bên ngoài — phiên bản cũ có, nhưng đã bị xoá hoàn toàn cùng đợt viết lại AI, vì màn chơi dẫn tới sau sảnh chờ đó chưa từng thực sự dùng dữ liệu phòng đã tham gia.

MVP: chọn Búa/Bao/Kéo, AI đoán và khắc chế, xem kết quả và độ tự tin, điểm số + chuỗi thắng cao nhất được nhớ lại.

## 4. Thiết kế hệ thống

```mermaid
flowchart TD
    A[home.html<br/>hiện chuỗi thắng cao nhất] --> B[rock-paper-scissors.html]
    B --> C[constants.js<br/>MOVES, COUNTERS, NGRAM_ORDERS=[3,2,1]]
    B --> D[rps-ai.js: class RpsAI]
    B --> E[rock-paper-scissors-main.js<br/>vòng chơi]
    E -->|người chơi chọn nước đi| F[ai.chooseMove<br/>predictNextPlayerMove trước, rồi lấy COUNTERS]
    F --> G{Bậc 3 đủ bằng chứng?}
    G -->|đúng| H[Dự đoán từ bảng n-gram bậc 3]
    G -->|sai| I{Bậc 2 đủ bằng chứng?}
    I -->|đúng| J[Dự đoán từ bảng n-gram bậc 2]
    I -->|sai| K{Bậc 1 đủ bằng chứng?}
    K -->|đúng| L[Dự đoán từ bảng Markov bậc 1]
    K -->|sai| M[Đoán ngẫu nhiên đều]
    E --> N[ai.recordPlayerMove<br/>cập nhật CẢ 3 bảng n-gram sau mỗi lượt]
    N --> O[ai.save vào localStorage]
```

Phần thiết kế trung tâm là `predictNextPlayerMove` — một chuỗi kiểm tra "lùi dần" (fallback chain) từ bậc mô hình cụ thể nhất tới tổng quát nhất:

```javascript
predictNextPlayerMove() {
    for (const order of NGRAM_ORDERS) {   // [3, 2, 1]
        if (this.history.length < order) continue;
        const seq = this.history.slice(this.history.length - order);
        const counts = this.ngramTables[order][this.key(seq)];
        if (!counts) continue;

        const total = counts.rock + counts.paper + counts.scissors;
        if (total < NGRAM_MIN_EVIDENCE) continue;

        let best = MOVES[0];
        MOVES.forEach((m) => { if (counts[m] > counts[best]) best = m; });
        this.lastOrderUsed = order;
        this.lastConfidence = counts[best] / total;
        return best;
    }
    // không bậc nào đủ bằng chứng — đoán ngẫu nhiên đều
    ...
}
```

Duyệt từ bậc 3 xuống bậc 1, dùng ngay bậc đầu tiên có đủ bằng chứng (`total >= NGRAM_MIN_EVIDENCE`) — nghĩa là AI luôn ưu tiên mẫu hình *cụ thể nhất mà nó đủ tin tưởng*, chỉ lùi về mẫu hình tổng quát hơn khi mẫu cụ thể chưa có đủ dữ liệu. Đây là kỹ thuật "backoff" kinh điển trong các mô hình ngôn ngữ n-gram, áp dụng nguyên xi cho bài toán dự đoán chuỗi hành vi thay vì chuỗi từ.

## 5. Tech Stack

| Công nghệ | Vì sao chọn |
| --- | --- |
| **N-gram + chuỗi Markov bậc 1 làm fallback, không dùng thư viện machine learning nào** | Bài toán "dự đoán ký hiệu tiếp theo từ K ký hiệu gần nhất" là đúng định nghĩa của mô hình n-gram — không cần huấn luyện offline, không cần framework, chỉ cần một bảng tần suất cập nhật dần theo từng lượt chơi. |
| **`localStorage` lưu cả lịch sử lẫn toàn bộ bảng n-gram** | Không chỉ lưu một con số kết quả (như best score ở các game khác) — ở đây "trạng thái đã học" chính là sản phẩm cốt lõi cần giữ lại, nên toàn bộ mô hình (không chỉ điểm số) được tuần tự hoá thành JSON. |
| **Không thêm nhiễu ngẫu nhiên lên dự đoán đã đủ tự tin** | Một quyết định có ý thức, được ghi rõ trong README: AI chơi *thuần* theo dữ liệu học được, không giả vờ nương tay — người chơi hoàn toàn ngẫu nhiên sẽ tự nhiên đẩy AI về chế độ đoán ngẫu nhiên (không mẫu hình nào tích luỹ đủ bằng chứng), đúng hành vi kỳ vọng của một bộ dự đoán dựa trên mẫu hình, không phải lỗi. |

## 6. Quá trình phát triển

### Giai đoạn trước (đã bị xoá) — Sảnh chờ và trick CSS `:checked`

Theo ghi chú còn lại trong README, phiên bản đầu tiên của game này có một sảnh chờ chọn phòng dựa trên một API giả lập bên thứ ba, dẫn vào một màn chơi hoàn toàn không có logic JavaScript — chỉ dùng thuộc tính CSS `:checked` để tạo ra một cơ chế chọn nước đi mang tính phản xạ/may rủi. Toàn bộ phần này bị xoá bỏ hoàn toàn trong đợt viết lại AI, với một lý do cụ thể: dữ liệu phòng đã tham gia qua sảnh chờ đó *chưa bao giờ thực sự được dùng* ở màn chơi phía sau — tức là toàn bộ tầng sảnh chờ chỉ tồn tại như một lớp vỏ không phục vụ gì cho gameplay thật.

### Giai đoạn 1 (bản hiện tại) — Markov bậc 1: nước gần nhất dự đoán nước tiếp theo

Nền tảng đơn giản nhất: một bảng `{lastMove: {rock: n, paper: n, scissors: n}}`, cập nhật sau mỗi lượt, dự đoán bằng cách chọn nước có tần suất cao nhất theo sau nước gần nhất của người chơi.

### Giai đoạn 2 — Mở rộng lên n-gram bậc 2 và 3

Thêm hai bảng nữa cho chuỗi 2 và 3 nước gần nhất, cùng cơ chế "lùi dần" ưu tiên bậc cao hơn khi đủ bằng chứng — con người thường chơi theo thói quen chuỗi dài hơn một bước đơn lẻ (ví dụ "sau khi thắng thì đổi nước", "ra Búa hai lần liên tiếp thì lần ba đổi khác"), nên bậc càng cao càng bắt được mẫu hình tinh vi hơn, miễn là đã tích luỹ đủ dữ liệu.

### Giai đoạn 3 — Độ tự tin và lưu trạng thái bền vững

`lastConfidence`/`lastOrderUsed` được lưu lại sau mỗi dự đoán để hiển thị lên giao diện — không chỉ AI thắng, mà AI còn "giải thích" được vì sao nó đoán như vậy, tăng cảm giác minh bạch thay vì một hộp đen. `save()`/`load()` tuần tự hoá toàn bộ trạng thái học vào `localStorage`, biến AI thành một đối thủ "nhớ" người chơi qua nhiều lần ghé thăm trang, không phải học lại từ đầu mỗi phiên.

## 7. Những bug đáng nhớ

### Khi hoà điểm trong dữ liệu học được, AI luôn nghiêng về đúng một phía

**Phát hiện khi đọc lại vòng lặp chọn "nước đi có tần suất cao nhất" để viết bài này:**

```javascript
let best = MOVES[0];   // MOVES = ["rock", "paper", "scissors"] — luôn bắt đầu từ "rock"
MOVES.forEach((m) => {
    if (counts[m] > counts[best]) best = m;
});
```

Điều kiện so sánh dùng `>` (lớn hơn *nghiêm ngặt*), không phải `>=`. Nếu dữ liệu học được có hai (hoặc cả ba) nước đi hoà tần suất — hoàn toàn có thể xảy ra, đặc biệt sớm trong quá trình học khi `NGRAM_MIN_EVIDENCE = 2` nghĩa là chỉ cần đúng 2 lần quan sát đã đủ để một mẫu hình được coi là "có bằng chứng" (ví dụ Búa từng theo sau đúng 1 lần, Kéo cũng từng theo sau đúng 1 lần, tổng vừa đủ 2) — vòng lặp trên **luôn** chọn ra nước đi xuất hiện *sớm nhất trong mảng `MOVES`* làm kết quả hoà, vì chỉ nước có tần suất *thực sự cao hơn* `best` hiện tại mới ghi đè được nó. Với thứ tự `MOVES = ["rock", "paper", "scissors"]`, điều này có nghĩa: mọi tình huống hoà điểm trong dữ liệu học được đều được AI diễn giải là "người chơi sắp ra Búa" — không bao giờ là Bao hay Kéo, dù cả ba đều đang hoà tần suất bằng nhau tuyệt đối.

**Hệ quả thực tế:** Vì AI luôn chơi nước khắc chế dự đoán (`COUNTERS[predicted]`), một tình huống hoà điểm sẽ luôn khiến AI ra **Bao** (khắc chế Búa) — bất kể việc "hoà" đó thực ra có nghĩa là AI không có cơ sở rõ ràng nào để thiên vị bất kỳ phía nào. Một người chơi đủ tinh ý (hoặc đủ may mắn) nhận ra khuôn mẫu này về lý thuyết có thể khai thác nó ở những điểm dữ liệu mỏng.

**Vì sao chưa sửa:** Ảnh hưởng thực tế khá nhỏ — càng chơi nhiều ván, dữ liệu càng dày, khả năng hoà tần suất tuyệt đối giữa các nước đi càng hiếm dần (tổng số quan sát tăng, hoà điểm chẵn giữa 3 lựa chọn ngày càng khó xảy ra ngẫu nhiên). Thiên vị chỉ thực sự có ý nghĩa thống kê ở giai đoạn đầu học, khi dữ liệu còn mỏng — đúng giai đoạn mà bản thân dự đoán cũng chưa đáng tin cậy nhiều.

**Điều rút ra:** Bất kỳ thuật toán nào chọn "phần tử tốt nhất" bằng một vòng lặp so sánh `>` với một giá trị khởi tạo mặc định đều tiềm ẩn một thiên vị hệ thống về phía phần tử đó khi có hoà điểm — thiên vị này thường vô hình cho tới khi có ai đó cụ thể hoá câu hỏi "nếu hai giá trị bằng nhau thì sao?" thay vì chỉ nghĩ về trường hợp "giá trị lớn nhất rõ ràng". Với một AI được quảng cáo là "học pattern công bằng, không thiên vị", đây là loại thiên vị dễ bị bỏ sót nhất vì nó không nằm ở dữ liệu học được (dữ liệu hoàn toàn khách quan), mà nằm ở chính logic *diễn giải* dữ liệu đó khi có nhiều hơn một câu trả lời "đúng như nhau".

## 8. Những quyết định sai

**Không có cơ chế phá vỡ hoà điểm ngẫu nhiên khi nhiều nước đi có cùng tần suất cao nhất** — như đã phân tích ở Bug, đây là nguyên nhân trực tiếp của thiên vị hệ thống về phía "Búa". Một cách sửa đơn giản: khi phát hiện nhiều nước đi cùng đạt tần suất cao nhất, chọn ngẫu nhiên đều trong số chúng thay vì luôn lấy phần tử đầu tiên theo thứ tự mảng cố định.

## 9. Những điều học được

- **"Chọn phần tử có giá trị cao nhất bằng vòng lặp so sánh `>`" là một khuôn mẫu code cực kỳ phổ biến, và luôn mang theo một giả định ngầm ít ai để ý: khi hoà, phần tử xuất hiện trước trong thứ tự duyệt sẽ thắng.** Giả định đó vô hại trong phần lớn ứng dụng, nhưng trở thành một thiên vị có ý nghĩa thống kê khi thứ tự duyệt đó (ở đây là `MOVES`, một mảng hằng số cố định) không mang ý nghĩa ngẫu nhiên gì cả.
- **Xoá bỏ hoàn toàn một tính năng cũ (sảnh chờ + API giả lập) khi phát hiện phần logic phía sau nó chưa từng thực sự dùng dữ liệu của tính năng đó là một quyết định dọn dẹp lành mạnh** — giữ lại một tầng UI không phục vụ gì cho gameplay chỉ vì nó "đã xây rồi" mới là lựa chọn tệ hơn.
- **Một AI "học pattern, không thêm nhiễu giả tạo" là lựa chọn thiết kế minh bạch và đáng ca ngợi** — nhưng minh bạch tuyệt đối cũng đồng nghĩa mọi thiên vị nhỏ trong logic diễn giải dữ liệu (như trường hợp hoà điểm ở đây) đều lộ ra rõ ràng hơn, không có lớp nhiễu ngẫu nhiên nào để "che" nó đi một cách tình cờ.

## 10. Kết quả

| Hạng mục | Con số |
| --- | --- |
| Tổng số dòng code (JS + CSS + HTML) | 723 dòng |
| `css/rock-paper-scissors.css` | 239 dòng |
| `js/rps-ai.js` | 96 dòng |
| `js/rock-paper-scissors-main.js` | 133 dòng |
| `js/constants.js` | 27 dòng |
| Số bậc n-gram | 3 (bậc 3, 2, rồi Markov bậc 1) |
| Bằng chứng tối thiểu để tin một mẫu hình | 2 lần quan sát |
| Test tự động | 0 |
| CI/CD | Không có |

## 11. Nếu làm lại từ đầu

- **Sửa vòng lặp chọn nước đi tốt nhất để xử lý hoà điểm bằng cách chọn ngẫu nhiên trong số các nước đi đồng hạng**, thay vì mặc định về phần tử đầu tiên trong `MOVES` — sửa tận gốc thiên vị đã ghi nhận ở phần 7, chỉ cần đổi từ chọn giá trị lớn nhất đơn thuần sang thu thập danh sách "đồng hạng cao nhất" rồi chọn ngẫu nhiên một trong số đó.
- **Ghi lại rõ ràng trong README (thay vì chỉ để lại một dòng ghi chú ngắn) toàn bộ lý do và phạm vi của lần viết lại từ sảnh chờ API sang AI n-gram** — bản ghi chú hiện tại đã khá tốt, nhưng một bản đầy đủ hơn (kèm ví dụ dữ liệu trước/sau) sẽ giúp bất kỳ ai đọc lại sau này hiểu ngay quyết định đó mà không cần suy luận ngược từ code.

## 12. Kết

Oẳn Tù Tì có luật chơi đơn giản nhất repo, nhưng lại chứa đựng đoạn code "thông minh" nhất theo một nghĩa khác — một AI thực sự học và thích nghi, không giả vờ bằng số ngẫu nhiên có trọng số cố định. Điều thú vị là chính sự minh bạch tuyệt đối đó (không có gì để "che" bằng nhiễu ngẫu nhiên) lại khiến một thiên vị rất nhỏ, chỉ xảy ra ở đúng những tình huống hoà điểm hiếm gặp, trở nên dễ lần ra khi đọc lại bằng đúng câu hỏi: "nếu không có một câu trả lời rõ ràng, code sẽ làm gì?"
