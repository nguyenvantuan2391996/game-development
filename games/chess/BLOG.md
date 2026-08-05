# Hành trình tự viết một AI Cờ Vua bằng JavaScript thuần, không thư viện, không thương tiếc

Có một buổi tối mình ngồi test lại con AI cờ vua vừa viết xong, tự tin đến mức đã nghĩ sẵn caption khoe trên Facebook. Ván đầu tiên, mình chơi trắng, đẩy tốt e4 như một quý ông. AI đi e5. Mình phát triển mã, nó phát triển tượng. Đến nước thứ 8, mình nhập thành bên cánh vua — và con vua của mình lập tức "dịch chuyển" thẳng qua một ô đang bị chiếu, như thể vừa học được phép thuật Nhảy Độn Thổ. Đó là lúc mình nhận ra: viết một bàn cờ nhìn cho đẹp thì dễ, còn viết đúng luật chơi cờ vua — thứ mà con người đã mất hàng trăm năm để chuẩn hoá — mới là bài toán thật sự.

Repo `game-development` này vốn là một bộ sưu tập game nhỏ, phần lớn không có "đối thủ" thông minh thật sự — Caro thì AI chấm điểm theo bảng heuristic đơn giản, mấy game khác địch chỉ đi ngẫu nhiên. Mình muốn có ít nhất một game mà AI thật sự phải suy nghĩ: duyệt cây nước đi, đánh giá thế cờ, ra quyết định thay vì random hay lookup bảng. Có một lựa chọn dễ hơn nhiều — nhúng `chess.js` để lo phần luật, chỉ viết AI lên trên — nhưng làm vậy thì phần khó nhất, sinh nước đi hợp lệ và lọc nước đi khiến vua bị chiếu, mình sẽ chẳng bao giờ thật sự hiểu. Đây là side-project để học, nên mình chọn đường khó: tự viết hết, từ bàn cờ rỗng, JavaScript thuần, không framework, không build tool.

Phần lọc nước đi hợp lệ là chỗ mình dành nhiều thời gian nhất. Ý tưởng nghe đơn giản: một nước đi chỉ hợp lệ nếu sau khi đi xong, vua của chính mình không bị chiếu. Cách cài đặt thật thà nhất — và cũng là cách mình chọn — là với mỗi nước đi giả định, áp dụng nó lên bàn cờ, kiểm tra vua có bị tấn công không, rồi hoàn tác:

```javascript
function getLegalChessMoves(board, color, enPassantTarget) {
    const pseudo = allChessPseudoMoves(board, color, enPassantTarget);
    const legal = [];
    pseudo.forEach((move) => {
        const undo = applyChessMove(board, move);
        if (!isChessInCheck(board, color)) legal.push(move);
        undoChessMove(board, undo);
    });
    return legal;
}
```

Đơn giản, dễ chứng minh đúng — nhưng chậm về mặt lý thuyết: với mỗi nước đi giả định, phải quét lại toàn bộ bàn cờ để xem có quân địch nào tấn công ô vua không. Lúc viết, mình biết thừa đây không phải cách nhanh nhất, nhưng cố tình không tối ưu sớm — viết bản đúng trước, đo xem có chậm thật không rồi mới quyết định. Điều này sẽ quay lại "cắn" mình sau, khi AI cần gọi hàm này hàng nghìn lần trong một lần tìm kiếm.

Con bug đầu tiên đáng nhớ chính là cái mở đầu bài này: nhập thành xuyên qua ô đang bị chiếu. Hàm `getCastlingMoves` ban đầu chỉ kiểm tra "vua chưa từng đi, xe chưa từng đi, các ô giữa trống" — quên mất luật: vua không được nhập thành nếu đang bị chiếu, không được đi qua ô bị tấn công, và không được đáp xuống ô bị tấn công. Ba điều kiện, mình chỉ nhớ có một. Cách sửa là thêm kiểm tra `isChessSquareAttacked` cho chính ô vua đang đứng và cho từng ô vua sẽ đi qua:

```javascript
if (isChessSquareAttacked(board, row, 4, enemy)) return moves; // đang bị chiếu -> không nhập thành

if (
    kingRook && kingRook.type === "rook" && !kingRook.hasMoved &&
    !board[row][5] && !board[row][6] &&
    !isChessSquareAttacked(board, row, 5, enemy) &&
    !isChessSquareAttacked(board, row, 6, enemy)
) {
    moves.push({ fromR: row, fromC: 4, toR: row, toC: 6, castle: "king" });
}
```

Với một luật có nhiều mệnh đề, code theo trí nhớ là cách chắc chắn bỏ sót — luật nhập thành có tới 3 mệnh đề "không được" nằm rải rác trong đầu mình từ hồi học cấp 2, và viết checklist ra trước khi code chắc chắn tiết kiệm thời gian hơn debug sau đó.

Bug thứ hai thú vị hơn nhiều, vì nó không phải lỗi luật chơi mà là lỗi thuật toán. Bản đầu tiên mình viết minimax "sách giáo khoa" với hai nhánh `if (maximizingPlayer)` riêng biệt, gần như soi gương nhau. Chuyển sang negamax gộp hai nhánh đó lại, với quy ước: điểm số luôn tính theo góc nhìn của bên đang đi, và khi truyền xuống đệ quy cho đối thủ thì đảo dấu. Sau khi chuyển, AI đột nhiên chơi cực kỳ tệ — sẵn sàng thí hậu để đổi lấy một con tốt, như thể đang cố thua. In điểm số của từng nước đi ứng viên ra thì thấy: nước ăn hậu địch, đáng ra phải là điểm rất cao, lại nhận điểm âm. Nguyên nhân là mình quên đảo dấu khi gọi đệ quy — gọi `negamaxChess(...)` bình thường thay vì `-negamaxChess(...)`. Thiếu đúng một dấu trừ, AI vô tình tối ưu hoá điểm số cho đối thủ:

```javascript
function negamaxChess(board, depth, alpha, beta, color, enPassantTarget) {
    const legalMoves = getLegalChessMoves(board, color, enPassantTarget);
    if (legalMoves.length === 0) {
        if (isChessInCheck(board, color)) return -100000 - depth;
        return 0;
    }
    if (depth === 0) {
        const score = evaluateChessBoard(board);
        return color === WHITE ? score : -score;
    }

    const ordered = orderChessMoves(board, legalMoves);
    let best = -Infinity;
    for (const move of ordered) {
        const undo = applyChessMove(board, move);
        const nextEP = getEnPassantTargetAfterMove(move);
        const score = -negamaxChess(board, depth - 1, -beta, -alpha, opponentColor(color), nextEP);
        undoChessMove(board, undo);
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}
```

Điều đáng nói là không chỉ điểm số cần đảo dấu — `alpha` và `beta` khi truyền xuống cũng phải hoán đổi vị trí và đảo dấu (`-beta, -alpha`). Nếu chỉ sửa một trong hai chỗ, bug vẫn còn nhưng biểu hiện tinh vi hơn nhiều: AI chơi "hơi" tệ chứ không tệ hẳn, khó phát hiện hơn. Negamax gọn hơn minimax về số dòng code, nhưng cái gọn đó đổi bằng việc mọi ngữ nghĩa dấu dồn vào đúng một dòng duy nhất — sai một dấu trừ trong minimax cổ điển (hai nhánh riêng) thường chỉ ảnh hưởng một nhánh, còn sai trong negamax ảnh hưởng toàn bộ cây tìm kiếm, ở mọi độ sâu.

Việc đánh giá thế cờ (`evaluateChessBoard`) mình cố tình giữ rất đơn giản — giá trị quân cổ điển, cộng bonus kiểm soát trung tâm và bonus tốt tiến gần hàng phong cấp, không có king safety, không có bảng vị trí riêng cho từng loại quân như engine thật:

```javascript
function evaluateChessBoard(board) {
    let score = 0;
    for (let r = 0; r < CHESS_SIZE; r++) {
        for (let c = 0; c < CHESS_SIZE; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            let value = CHESS_PIECE_VALUES[piece.type];
            if (piece.type !== "king") value += CHESS_CENTER_BONUS[r][c] * 3;
            if (piece.type === "pawn") {
                const advance = piece.color === WHITE ? 6 - r : r - 1;
                value += Math.max(0, advance) * 4;
            }
            score += piece.color === WHITE ? value : -value;
        }
    }
    return score;
}
```

Chỗ mình học được điều khá phản trực giác nằm ở move ordering — sắp xếp nước đi thử trước theo giá trị quân bị ăn, giảm dần. Alpha-beta pruning không tự động nhanh, nó chỉ cắt nhánh hiệu quả nếu bạn duyệt nước đi tốt trước; thử ăn hậu trước khi thử đi tốt vô nghĩa giúp alpha/beta hội tụ nhanh hơn nhiều, tức cắt được nhiều nhánh hơn ở cùng độ sâu. Cùng một thuật toán, thứ tự duyệt khác nhau có thể khiến một cái nhanh gấp nhiều lần cái kia.

Con bug thứ ba xuất hiện khi test ở độ sâu 3 ply: có những thế cờ trung cuộc khiến tab trình duyệt đơ hẳn 2-3 giây, chip "AI đang suy nghĩ..." thậm chí không kịp hiện ra trước khi bị đơ. Ban đầu mình nghi thuật toán duyệt thừa nhánh nào đó, nhưng đếm số lần gọi `negamaxChess` thì thấy con số hoàn toàn hợp lý cho độ sâu 3. Vấn đề không nằm ở số lượng nước đi cần duyệt, mà ở chi phí mỗi lần duyệt: mỗi lần gọi `getLegalChessMoves` bên trong negamax lại phải quét lại toàn bộ 64 ô để kiểm tra tấn công — đúng cái "chưa đo được là chậm" ở phần lọc nước đi hợp lệ, giờ nhân với hàng chục nghìn lệnh gọi trong cây tìm kiếm thì chậm thật. Vấn đề thứ hai cộng dồn vào: chip "đang suy nghĩ" được set hiện ra rồi ngay lập tức gọi hàm tìm kiếm đồng bộ, trình duyệt chưa kịp repaint thì main thread đã bị chặn — UI đơ mà không có tín hiệu gì báo người chơi biết máy đang tính chứ không phải treo thật. Giải pháp rẻ nhất, không phải Web Worker, chỉ là nhường lại một tick cho trình duyệt vẽ lại:

```javascript
thinkingChip.hidden = false;
setTimeout(runAiMove, 60);
```

Không phải giải pháp "đúng" về kiến trúc — search vẫn chặn UI trong lúc chạy — nhưng đủ để trải nghiệm không còn cảm giác app bị đơ vô cớ.

Bug cuối cùng nằm ở phong hậu: tốt đi đến hàng cuối, đúng luật phải phong thành hậu, nhưng bàn cờ sau đó vẫn hiện icon tốt và nước tiếp theo bị tính sai theo giá trị 100 của tốt thay vì 900 của hậu. Log lại object quân cờ thì thấy `type` vẫn là `"pawn"` — việc gán `promotion: "queen"` được tạo đúng lúc sinh nước đi, nhưng `applyChessMove` ban đầu chỉ copy nguyên piece sang ô đích, không đọc field `promotion` để đổi type. Cách sửa chỉ đúng một dòng:

```javascript
const movedPiece = { ...piece, hasMoved: true };
if (move.promotion) movedPiece.type = move.promotion;
board[move.toR][move.toC] = movedPiece;
```

Đây là kiểu bug rất dễ tái phạm: khi một hành động có hai giai đoạn — sinh ra một đề xuất nước đi, rồi thực thi nó — rất dễ implement đúng giai đoạn đầu và quên giai đoạn sau, vì giai đoạn đầu thường được test kỹ hơn (highlight nước đi hợp lệ hiện ra ngay), còn giai đoạn thực thi chỉ lộ ra khi bạn thực sự đi nước đó và nhìn kỹ trạng thái sau.

Một quyết định mình từng cân nhắc rồi bỏ: dùng bitboard để biểu diễn bàn cờ, vì "nghe nói dân chuyên nghiệp làm vậy". Ngồi vẽ sơ đồ bitmask được nửa tiếng thì nhận ra đây là kỹ thuật để tăng tốc engine tìm kiếm hàng triệu node mỗi giây, còn AI của mình chỉ cần đủ nhanh để không làm người chơi sốt ruột ở độ sâu 3. Mảng 2 chiều với object `{ type, color, hasMoved }` dễ đọc, dễ debug bằng `console.log` hơn hẳn, và tốc độ vẫn ổn với scope MVP — chọn công cụ theo độ "ngầu" thay vì theo yêu cầu thực tế là cái bẫy kinh điển mình suýt sa vào.

Nhìn lại, cái mình từng nghĩ là khó nhất — thuật toán tìm kiếm, negamax, alpha-beta — hoá ra chỉ chiếm chưa tới 90 dòng code, và sau khi hiểu đúng ý tưởng thì viết lại không mất quá một buổi tối. Cái tốn thời gian thật sự, cái khiến mình phải soi từng con bug, lại là những luật mà bất kỳ ai từng học chơi cờ đều biết nằm lòng: vua không được nhập thành qua ô bị chiếu, tốt phong hậu phải đổi loại quân, bắt tốt qua đường chỉ có giá trị đúng một nước. Những thứ "ai cũng biết" hoá ra lại dễ code sai nhất, vì con người nhớ luật theo trực giác, còn máy tính cần liệt kê tường minh từng điều kiện một, không thiếu không thừa. Phần khó của cờ vua chưa bao giờ là "chơi hay" — mà luôn là "chơi đúng" trước đã.
