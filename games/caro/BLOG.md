# Caro: một hàm kiểm tra thắng cuộc không hỏi "quân của ai", chỉ tin vào một biến toàn cục

Caro (Gomoku, nối 5 quân) là game cờ bàn thứ hai trong repo có AI thực sự, nhưng đi theo hướng hoàn toàn khác với mấy con AI học qua thời gian ở game khác: không có bộ nhớ giữa các ván, không mạng nơ-ron, chỉ là một AI heuristic thuần tuý — chấm điểm từng ô trống bằng "chuỗi dài nhất máy tạo được nếu đánh vào đây" cộng "chuỗi dài nhất người chơi đang có mà nước này chặn được", không tìm kiếm sâu, không nhìn trước nhiều nước. Điều làm game này khác biệt trong repo là nó có tới ba chế độ chơi — 2 người, người đấu máy, máy tự đấu máy — dùng chung một bộ hàm cốt lõi. Và chính việc dùng chung đó là nơi mọi thứ trở nên thú vị.

Phần lõi kỹ thuật đáng chú ý nhất nằm ở cách AI chấm điểm một ô trống, kết hợp hai bảng tra cứu độc lập:

```javascript
let computerRun = Math.max(getHorizontal(i, j, O), getVertical(i, j, O), getRightDiagonal(i, j, O), getLeftDiagonal(i, j, O));
let humanRun = Math.max(getHorizontal(i, j, X), getVertical(i, j, X), getRightDiagonal(i, j, X), getLeftDiagonal(i, j, X));
let score = MAP_SCORE_COMPUTER.get(Math.min(6, computerRun)) + MAP_POINT_HUMAN.get(Math.min(5, humanRun - 1));
```

Bốn hàm `getHorizontal`/`getVertical`/`getRightDiagonal`/`getLeftDiagonal` đều đếm chuỗi bắt đầu từ `count = 1` — tức luôn giả định ô đang xét *đã* là quân của `player` truyền vào, dù ô đó thực tế đang trống, rồi đếm tiếp ra hai phía. Với `computerRun`, con số này dùng thẳng vì nó có nghĩa là "chuỗi máy sẽ có sau khi đánh". Nhưng với `humanRun` thì bị trừ đi 1 trước khi tra bảng, vì mục đích ở đây khác hẳn: không phải "chuỗi người chơi sẽ có" (vô nghĩa, đây là nước của máy) mà là "chuỗi người chơi đang có sẵn, không tính ô giả định vừa lấp". Hai công thức trông giống hệt nhau về mặt cú pháp nhưng mang ý nghĩa ngược chiều — tấn công nhìn về tương lai, phòng thủ nhìn về hiện tại — dùng chung đúng một cặp hàm đếm chuỗi cho cả hai việc.

Cái mình thấy đáng nói nhất khi đọc lại code này không phải là AI, mà là hàm `checkWin`:

```javascript
function checkWin(points) {
  return (
    getHorizontal(Number(points[0]), Number(points[1]), player) >= 5 ||
    getVertical(Number(points[0]), Number(points[1]), player) >= 5 ||
    getRightDiagonal(Number(points[0]), Number(points[1]), player) >= 5 ||
    getLeftDiagonal(Number(points[0]), Number(points[1]), player) >= 5
  );
}
```

`checkWin(points)` chỉ nhận đúng một tham số — toạ độ nước đi vừa đánh. Nó không có tham số nào cho biết "kiểm tra thắng cho quân X hay quân O" — thay vào đó nó âm thầm đọc biến toàn cục `player` để biết phải tìm chuỗi 5 quân của ai. Điều này chạy đúng, ở cả ba chế độ chơi, nhưng chỉ đúng vì đúng lúc gọi `checkWin`, `player` luôn được sắp xếp thủ công để trỏ về đúng quân vừa đánh — lặp lại chính xác ba lần ở ba đoạn code khác nhau, không có gì ràng buộc hay báo lỗi nếu một trong ba lần đó bị đảo thứ tự.

Lần theo cả ba đường thực thi: ở chế độ 2 người, `markCell(..., player)` đặt quân rồi `checkWin(points)` được gọi *trước khi* `player = player === X ? O : X;` đổi lượt — nên `player` vẫn đúng là người vừa đánh. Ở chế độ đấu máy, người luôn là X, và `player` được đảm bảo quay lại giá trị `X` ở cuối lượt trước; sau khi kiểm tra xong, `player = O;` được gán ngay trước khi máy đánh và gọi `checkWin` lần hai. Chế độ máy đấu máy lặp lại y hệt logic đó trong `ComputerAndComputer`. Cả ba đều đúng — nhưng đúng nhờ kỷ luật thủ công, không nhờ bất kỳ ràng buộc cấu trúc nào ngăn sai sót. Nếu ai đó, kể cả chính mình sau này, đảo thứ tự hai dòng bất kỳ trong số này — ví dụ gộp bước đổi lượt lên trước dòng kiểm tra thắng cho gọn — `checkWin` sẽ âm thầm kiểm tra nhầm quân, không exception, không gì bất thường hiện ra, chỉ đơn giản là một chiến thắng bị bỏ lỡ hoặc báo nhầm.

Đây không phải bug đang thực sự xảy ra ở bản hiện tại — mình đã lần theo cả ba đường và thứ tự gán, gọi hàm đều đúng ở thời điểm viết bài. Nhưng nó là kiểu "bug tiềm ẩn về mặt cấu trúc" đáng nhớ nhất mà mình gặp khi đọc lại code cũ: một hàm phụ thuộc vào trạng thái toàn cục thay vì tham số tường minh luôn mang theo một hợp đồng ngầm — "hãy chắc chắn gọi tôi đúng lúc" — không được compiler hay bất kỳ cơ chế nào enforce. Rủi ro không nằm ở việc viết sai từ đầu, mà ở việc sửa một trong ba đoạn code đó sau này mà không nhớ ra cả ba đều đang âm thầm dựa vào cùng một quy ước thứ tự.

Có một chi tiết nhỏ khác đáng nhắc: `getPointsComputer()` được gọi vô điều kiện ngay cả ở nước đi đầu tiên của chế độ máy đấu máy, dù kết quả của nó chắc chắn bị ghi đè ngay sau đó bởi luật "nước đầu ép vào giữa bàn":

```javascript
let pointsComputerA = getPointsComputer();
if (isFirst) {
  isFirst = false;
  pointsComputerA = [
    Math.floor(matrixGame.length / 2),
    Math.floor(matrixGame[0].length / 2),
  ];
}
```

Trên một bàn cờ hoàn toàn trống, `getPointsComputer` vẫn quét toàn bộ ô trống — có thể tới 3600 ô trên bàn 60×60 — gọi 8 hàm đếm chuỗi cho mỗi ô, trước khi kết quả bị vứt bỏ hoàn toàn. Không gây lỗi gì, chỉ là một lần tính toán lãng phí đúng ở nước đi duy nhất mà kết quả của nó không bao giờ được dùng — kiểm tra `isFirst` trước khi gọi hàm thay vì sau sẽ tránh được việc này hoàn toàn.

Còn một chỗ bất nhất quán thú vị khác trong bảng điểm AI: `MAP_SCORE_COMPUTER` chỉ gán điểm gần như tuyệt đối (`99999`) cho chuỗi đạt độ dài 6 (`Math.min(6, computerRun)`), trong khi luật thắng thực tế chỉ cần chuỗi 5 (`checkWin` dùng `>= 5`). Một nước đi tạo chuỗi đúng 5 quân — vốn đã là thắng ngay theo luật chơi — chỉ nhận điểm rất cao chứ không phải điểm tuyệt đối. Trong thực tế điều này chưa từng gây hậu quả quan sát được, vì tổng điểm tối đa có thể đạt từ mọi tổ hợp khác chưa bao giờ vượt qua con số đó với các số hiện có trong bảng — nhưng đây vẫn là một khoảng lệch ngữ nghĩa giữa "ngưỡng thắng tuyệt đối" ở luật chơi và ở bảng điểm AI, chỉ tình cờ không gây sai lệch hành vi nhờ khoảng cách đủ lớn giữa các con số.

Điều mình rút ra khi đọc lại toàn bộ file `caro-main.js` là: bốn hàm đếm chuỗi (`getHorizontal`, `getVertical`, hai hàm chéo) được viết một lần ở giai đoạn phát hiện thắng, rồi tái sử dụng gần như nguyên xi cho cả việc chấm điểm AI — một quyết định thiết kế khá gọn, không cần viết lại logic đếm chuỗi hai lần cho hai mục đích khác nhau. Nhưng sự tái sử dụng đó cũng là lý do khiến ý nghĩa của cùng một con số (`humanRun` vs `humanRun - 1`) trở nên dễ nhầm nếu không đọc kỹ ngữ cảnh gọi. Một hàm kiểm tra thắng phụ thuộc biến toàn cục có thể chạy đúng tuyệt đối trong hiện tại, nhưng "đã kiểm chứng đúng ở hiện tại" và "được cấu trúc để luôn đúng" là hai mức độ tin cậy rất khác nhau — mức đầu chỉ cần đọc kỹ code một lần, mức sau cần thiết kế lại để loại bỏ khả năng sai ngay từ gốc.
