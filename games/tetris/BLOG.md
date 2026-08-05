# Tetris tự viết: bảy quân trong một túi, và một nhánh phòng thủ chưa từng được kích hoạt

Hỏi bất kỳ ai từng cầm một chiếc máy Brick Game cầm tay đời cũ có những trò gì, câu trả lời rõ ràng nhất luôn có một cái tên đứng đầu danh sách: Tetris. Không có game nào khác trong thể loại "9999999 in 1" đó thực sự nổi tiếng hơn — phần lớn số game còn lại trên các máy đó chỉ là biến thể của chính Tetris với vài kiểu khối khởi đầu khác nhau, được đếm thành từng "game" riêng để thổi phồng con số quảng cáo. Viết một bản Tetris tự tay, không dùng thư viện, hoá ra là bài tập thú vị hơn mình tưởng — không phải vì logic xoay khối khó (nó không khó), mà vì có bao nhiêu chi tiết nhỏ của Tetris "chuẩn" (túi 7 quân, hệ thống điểm, ma trận xoay) đã trở thành quy ước ngầm định mà một bản tự viết cần quyết định có tuân theo hay không.

Về mặt kỹ thuật, đây cũng là game đầu tiên mình làm trong repo dùng lưới ô vuông rời rạc làm trung tâm logic, khác hẳn mọi game trước đó vốn dùng toạ độ liên tục. Bàn cờ 10×20 ô, mỗi ô 26px, không có gì "trôi" tự do — mọi va chạm chỉ là so sánh chỉ số hàng/cột nguyên, đơn giản hơn nhiều so với AABB hay va chạm tròn của các game trước.

Phần lõi của toàn bộ game nằm gọn trong một hàm duy nhất, `collides(matrix, row, col)`, được gọi lại từ mọi nơi khác — di chuyển, xoay, rơi mềm, rơi cứng, kiểm tra game over — không có phiên bản "kiểm tra va chạm" riêng cho từng loại thao tác:

```javascript
function collides(matrix, row, col) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (!matrix[r][c]) continue;
            const br = row + r;
            const bc = col + c;
            if (bc < 0 || bc >= COLS || br >= ROWS) return true;
            if (br >= 0 && board[br][bc]) return true;
        }
    }
    return false;
}
```

Quy toàn bộ "có được phép ở vị trí này không" về đúng một hàm nghĩa là mọi thao tác trong game đều chỉ là "thử một vị trí/hình dạng mới, hỏi `collides`, được thì nhận không thì bỏ". Không có logic va chạm nào bị viết lặp lại hai lần theo hai cách khác nhau.

Vấn đề kinh điển của mọi bản Tetris tự viết xuất hiện ngay khi mình thêm đủ 7 loại khối và hàm xoay ma trận: xoay tại chỗ gần tường sẽ luôn bị chặn dù không gian bên cạnh còn trống. Giải pháp mình chọn không phải bảng wall-kick chuẩn SRS (khác nhau cho từng cặp trạng thái xoay, từng loại khối), mà đơn giản hơn nhiều:

```javascript
const WALL_KICK_OFFSETS = [0, -1, 1, -2, 2];

function rotate() {
    const rotated = rotateMatrix(current.matrix);
    for (const offset of WALL_KICK_OFFSETS) {
        if (!collides(rotated, current.row, current.col + offset)) {
            current.matrix = rotated;
            current.col += offset;
            return;
        }
    }
}
```

Thử dịch ngang lần lượt 0, -1, +1, -2, +2 ô — offset gần nhất trước, xa dần nếu vẫn bị chặn. Không "chuẩn thi đấu" nhưng đủ để xoay khối sát tường không bị kẹt vô lý, giải quyết đúng vấn đề thực tế gặp phải mà không cần implement toàn bộ đặc tả SRS. Người từng chơi Tetris hiện đại, quen với hành vi kick chính xác từng khối (đặc biệt là T-spin), sẽ nhận ra ngay bản này "xoay không giống hệt" bản gốc trong các tình huống sát tường phức tạp — nhưng đó là một đánh đổi có ý thức, không phải sai sót.

Phá dòng cũng là một chỗ mình thấy đáng kể vì cách viết ngắn hơn hẳn cách làm phổ biến (tự viết vòng lặp `splice`/dịch từng hàng xuống một, vốn dễ sai chỉ số khi nhiều dòng bị xoá cùng lúc):

```javascript
const remaining = board.filter((row) => !row.every(Boolean));
const clearedCount = ROWS - remaining.length;
const newRows = [];
for (let i = 0; i < clearedCount; i++) newRows.push(new Array(COLS).fill(null));
board = newRows.concat(remaining);
```

Lọc ra các hàng *chưa* đầy, rồi ghép thêm đúng số hàng trống ở đầu mảng bằng với số hàng đã xoá. Không quan trọng những dòng nào bị xoá hay chúng nằm rải rác ra sao, kết quả luôn đúng vì các hàng còn lại tự nhiên giữ nguyên thứ tự tương đối.

Điều thú vị nhất mình phát hiện lại không phải một bug, mà là một nhánh phòng thủ chưa từng được kích hoạt. Nhìn lại điều kiện `if (br >= 0 && board[br][bc]) return true;` trong `collides`, nó ngầm cho phép `br < 0` — khối có phần nằm phía trên bàn cờ — trôi qua mà không bị coi là va chạm. Về nguyên tắc đây là hành vi hợp lý, nhiều bản Tetris cho khối sinh ra một phần còn ở phía trên vùng nhìn thấy. Nhưng lần theo toàn bộ nơi `row` của khối hiện tại có thể thay đổi: `spawnPiece` luôn đặt `row: 0`, di chuyển ngang không đổi `row`, rơi mềm/cứng chỉ tăng `row`, xoay không đổi `row` cơ sở. Nói cách khác, `row` không bao giờ giảm xuống dưới 0 trong toàn bộ vòng đời của một khối — nhánh cho phép `br < 0` được viết ra với đúng ý định phòng thủ, nhưng theo cách bàn cờ được thiết kế hiện tại, nó chưa từng có cơ hội được kích hoạt.

Mình quyết định không sửa gì cả. Đây không phải lỗi — game hoạt động đúng, và nhánh đó vô hại, không gây kết quả sai ở bất kỳ đường đi thực thi nào. Giữ nguyên là lựa chọn hợp lý: nó vẫn đóng vai trò lưới an toàn nếu sau này `spawnPiece` được đổi để sinh khối ở `row < 0`, cách làm phổ biến hơn trong nhiều bản Tetris khác để I-piece nằm ngang không bị "cắt cụt" lúc vừa xuất hiện. Không phải mọi đoạn code "chưa từng chạy tới" đều là dấu hiệu của lỗi hay code thừa cần xoá — đôi khi nó là phòng thủ hợp lý cho một điều kiện *hiện tại* không xảy ra nhưng *có thể* xảy ra nếu một quyết định thiết kế khác thay đổi trong tương lai.

Viết một bản Tetris tự tay không khó ở phần "làm cho nó chạy" — khó ở việc quyết định, với mỗi chi tiết nhỏ đã trở thành quy ước ngầm của thể loại, nên tuân theo nguyên bản tới đâu và đơn giản hoá tới đâu. Bảng điểm mình giữ nguyên theo đúng chuẩn Tetris Guideline hiện đại (100/300/500/800 nhân theo cấp, rơi mềm 1 điểm/ô, rơi cứng 2 điểm/ô) vì đó là thứ người chơi *cảm nhận được rõ nhất* — còn độ chính xác tuyệt đối của wall-kick, thứ chỉ người chơi kỳ cựu mới để ý, thì mình chọn đơn giản hoá. Một đánh đổi hợp lý cho một bản clone viết trong một buổi, không phải một triển khai thi đấu chuẩn giải.
