# Tưởng tái dùng được engine Cờ Vua cho Cờ Tướng — hoá ra viết lại gần hết

Sau khi engine Cờ Vua chạy ổn — đủ đúng luật, AI đủ để không nhường quân miễn phí — mình bắt tay vào Cờ Tướng với một tâm thế khá tự tin: cùng là bàn cờ ô vuông, cùng khái niệm nước đi, cùng chiếu tướng, chắc chỉ cần đổi luật di chuyển từng quân là xong, kiến trúc engine/AI/UI giữ nguyên. Ngồi gõ được vài chục dòng đầu thì nhận ra: cái duy nhất tái dùng được thật sự là *cách tổ chức file* — engine tách khỏi AI tách khỏi UI — còn luật chơi thì gần như phải viết lại từ số 0. Tướng và sĩ bị giới hạn trong cung 3×3, tượng không bao giờ được qua sông, pháo phải nhảy qua đúng một quân làm "ngòi" mới ăn được quân phía sau nó, mã và tượng có luật chặn chân/chặn mắt hoàn toàn khác cách bishop/knight cờ vua di chuyển. Mình từng nghiêm túc cân nhắc gộp chung một "board game engine" tổng quát dùng được cho cả hai, nhưng ý tưởng đó sụp đổ ngay khi liệt kê hết những luật riêng này — ép chúng vào một abstraction dùng chung sẽ chỉ tạo ra một đống `if (gameType === "xiangqi")` rải khắp nơi.

Một khác biệt nhỏ nhưng dễ bị bỏ qua nếu chỉ copy nguyên xi thói quen từ Cờ Vua: quân cờ Cờ Tướng đứng *trên giao điểm của các đường kẻ*, không nằm giữa các ô vuông như Cờ Vua. Quy đổi toạ độ pixel sang toạ độ bàn cờ vì vậy không thể chia lấy phần nguyên như kiểu Cờ Vua (đang ở ô nào), mà phải làm tròn để tìm giao điểm gần nhất:

```javascript
function toPixel(r, c) {
    return { x: MARGIN + c * CELL, y: MARGIN + r * CELL };
}

function toBoardCoord(px, py) {
    const c = Math.round((px - MARGIN) / CELL);
    const r = Math.round((py - MARGIN) / CELL);
    return { r, c };
}
```

Nếu lỡ dùng `Math.floor` thay vì `Math.round` ở đây — thói quen phản xạ từ việc chia ô lưới kiểu Cờ Vua — người chơi sẽ phải click hơi lệch về góc trên-trái của mỗi giao điểm mới trúng quân, thay vì click ngay giữa. Một bug UX âm thầm, không crash, chỉ khiến game "cảm giác rời tay" mà không rõ lý do.

Quân phức tạp nhất để viết là pháo, và cũng là quân duy nhất trong toàn bộ Cờ Tướng lẫn Cờ Vua có hai "chế độ di chuyển" khác nhau tuỳ vào việc có ăn quân hay không: di chuyển như xe khi trượt tới ô trống, nhưng để ăn một quân địch, phải có đúng một quân bất kỳ nằm giữa làm "ngòi" (screen), rồi mới ăn được quân tiếp theo sau ngòi đó.

```javascript
} else if (type === "cannon") {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        let nr = r + dr;
        let nc = c + dc;
        let screenFound = false;
        while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!screenFound) {
                if (!target) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                } else {
                    screenFound = true;
                }
            } else if (target) {
                if (target.color !== color) moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
                break;
            }
            nr += dr;
            nc += dc;
        }
    });
}
```

Không có quân nào trong Cờ Vua hành xử tương tự, nên đây là đoạn code 100% viết mới, không có gì để mượn ý tưởng từ engine cũ.

Phần khung negamax + alpha-beta + move ordering thì ngược lại — gần như sao chép nguyên xi từ Cờ Vua, vì bản chất thuật toán tìm kiếm minimax không phụ thuộc luật chơi cụ thể. Nhưng chính vì bản năng tái dùng đó mạnh, mình suýt copy sai một nhánh logic tưởng chừng vô hại. Ở Cờ Vua, hết nước đi hợp lệ phải phân biệt hai trường hợp: đang bị chiếu (chiếu bí, thua) hay không bị chiếu (hết cờ, hoà — stalemate). Ngồi gõ nhánh xử lý "hết nước đi" theo phản xạ, mình suýt copy nguyên cụm kiểm tra `isInCheck` để phân biệt thua/hoà — cho tới khi dừng lại tra luật: trong Cờ Tướng, **không có khái niệm hoà do hết nước đi**. Bên nào hết nước đi hợp lệ, dù có đang bị chiếu hay không, đều xử thua ngay. Bản cuối cùng gọn hơn hẳn:

```javascript
function negamax(board, depth, alpha, beta, color) {
    const legalMoves = getLegalMoves(board, color);
    if (legalMoves.length === 0) {
        return -100000 - depth;
    }
    // ...
}
```

Không có nhánh rẽ theo `isInCheck` nào ở đây cả — và đúng ra là không nên có. Đây là một trong số ít lần "bê nguyên" code cũ suýt gây hại thay vì có ích: bản năng tái dùng mạnh đến mức khiến mình gần như chép một nhánh logic đúng-cho-Cờ-Vua nhưng sai-cho-Cờ-Tướng, chỉ vì hai trò chơi trông giống nhau bề ngoài.

Bug thật sự — chưa sửa — lại nằm ở một luật mình bỏ sót hoàn toàn: luật "tướng đối mặt". Trong luật Cờ Tướng thật, hai tướng không bao giờ được đứng thẳng hàng trên cùng một cột dọc mà không có quân nào chắn ở giữa, vì về lý thuyết một tướng có thể "bay" thẳng qua cột trống để ăn tướng kia. Trong một ván đấu người-với-người bình thường, sau khoảng 15 nước, hai tướng của mình tình cờ đứng thẳng hàng đúng như vậy — và game không báo lỗi gì cả, ván đấu cứ tiếp tục như chưa có chuyện gì xảy ra. Lần theo nguyên nhân, hoá ra `pseudoMovesForPiece` cho loại `"general"` chỉ sinh 4 nước đi 1-bước trong cung, không có bất kỳ nước đi "bay" dọc cột nào được mô hình hoá — và cơ chế phát hiện chiếu tướng (`isInCheck`) chỉ dựa vào việc duyệt pseudo-move *thật* của từng quân, nên nó không bao giờ có thể phát hiện ra kiểu đe doạ này. Vấn đề gốc rễ: luật tướng đối mặt không phải một *nước đi* mà quân tướng có thể thực hiện trong ván đấu thực tế, nó là một *ràng buộc bổ sung* lên trạng thái toàn bàn cờ, hoàn toàn tách biệt khỏi cơ chế sinh pseudo-move. Có những luật trong một trò chơi không biểu diễn được dưới dạng "quân X có thể đi tới ô Y" — và một kiến trúc được xây hoàn toàn xoay quanh khái niệm nước đi từng quân sẽ có điểm mù tự nhiên với loại luật đó, không phải vì nó khó, mà vì nó không nằm trong danh sách "7 loại quân, 7 bộ luật" đã liệt kê từ đầu.

Một bug khác, nhỏ hơn nhưng thú vị không kém, xuất hiện khi mình mash phím "Chơi lại" liên tục để test nhanh nhiều ván. Có một lần bấm "Chơi lại" ngay sau khi vừa đi một nước — đúng lúc chip "AI đang suy nghĩ" vừa hiện lên — bàn cờ về lại vị trí ban đầu như mong đợi, nhưng chưa đầy một giây sau, một quân Đỏ, quân của chính mình, tự động di chuyển mà không ai bấm gì cả. Đọc lại `afterMove`, `runAiMove` và `restart`:

```javascript
function afterMove() {
    turn = opponent(turn);
    // ...
    if (mode === "ai" && turn !== humanColor) {
        aiThinking = true;
        thinkingChip.hidden = false;
        setTimeout(runAiMove, 60);
    }
}

function runAiMove() {
    const move = findBestMove(board, turn, AI_DEPTH);
    // ...
    applyMove(board, move);
    lastMove = move;
    afterMove();
}

function restart() {
    board = createInitialBoard();
    turn = RED;
    // ...
    aiThinking = false;
    thinkingChip.hidden = true;
    overlay.hidden = true;
    updateHud();
    render();
}
```

Không có bất kỳ nơi nào trong `restart()` huỷ bỏ `setTimeout(runAiMove, 60)` đã được lên lịch trước đó, và `runAiMove` không có kiểm tra "relevance" nào cả — nó đọc biến `board`/`turn` ở đúng thời điểm nó *thực thi*, không phải thời điểm nó được *lên lịch*. Nút "Chơi lại" không hề bị khoá bởi `aiThinking` (khác với click quân cờ trên canvas, vốn có guard riêng), nên nếu bấm đúng trong khung 60ms giữa lúc `setTimeout` được đặt và lúc nó thật sự chạy, `restart()` reset `board` về thế cờ ban đầu và `turn` về Đỏ — nhưng timeout cũ vẫn tồn tại độc lập, và khi nó fire, `runAiMove` tính nước đi tốt nhất *cho quân Đỏ* rồi tự động thực hiện nó. Một "nước đi ma" người chơi không hề yêu cầu. Cách sửa mình đã biết nhưng chưa áp dụng: một bộ đếm thế hệ, tăng lên mỗi lần `restart()` được gọi, chụp lại tại thời điểm `setTimeout` được đặt và so khớp lại ngay đầu `runAiMove` — đúng mẫu hình mình từng dùng để giải quyết loại vấn đề này ở màn hình tìm kiếm nhạc của game Audition, chỉ là chưa rảnh tay áp dụng lại ở đây. `setTimeout` đã lên lịch không tự động biết rằng thế giới đã đổi khác kể từ lúc nó được đặt hẹn.

Cùng để độ sâu tìm kiếm AI là 3, cùng cấu trúc negamax + alpha-beta, nhưng AI Cờ Tướng có cảm giác khựng lâu hơn rõ rệt so với AI Cờ Vua ở những thế cờ nhiều quân. Lý do cộng dồn từ hai phía: bàn Cờ Tướng có 90 giao điểm so với 64 ô của Cờ Vua, nên mọi lệnh gọi kiểm tra chiếu (chạy lặp lại ở mọi nút của cây tìm kiếm) phải quét nhiều hơn khoảng 40% số ô; và quân pháo có tập nước đi giả định tốn công tính hơn hẳn xe hay hậu cờ vua ở cùng vị trí, vì nó phải quét tiếp cả sau ngòi thay vì dừng lại ngay khi gặp vật cản đầu tiên. Mình không tối ưu gì thêm — độ sâu 3 vẫn hoàn thành trong khoảng thời gian người chơi thông cảm được, và mẫu `setTimeout(60ms)` trước khi tính đã đủ để chip "AI đang suy nghĩ" kịp hiện ra. Nhưng bài học thì rõ: một kiến trúc "đủ nhanh" ở bài toán A không tự động đủ nhanh ở bài toán B chỉ vì dùng cùng thuật toán — kích thước không gian trạng thái là một biến độc lập, và tái dùng nguyên xi một con số cấu hình từ dự án trước mà không đo lại là một giả định đáng ngờ, dù lần này may mắn vẫn nằm trong ngưỡng chấp nhận được.

Bài học lớn nhất sau dự án này không phải về Cờ Tướng hay Cờ Vua cụ thể, mà về chính cảm giác tự tin sau khi vừa hoàn thành một việc tương tự. Cái giá rẻ nhất của việc "đã làm cái này một lần rồi" là nó khiến người ta bỏ qua bước dừng lại hỏi luật ở đây có thật sự giống không, hay chỉ trông giống thôi — và câu hỏi đó, với hai trò chơi tưởng chừng là anh em ruột như Cờ Vua và Cờ Tướng, hoá ra luôn cần được hỏi lại từ đầu, không có ngoại lệ. Con tướng vẫn đứng thẳng hàng với tướng địch trên bàn cờ của mình lúc này, không ai buồn cấm cản — và có lẽ để một bug như vậy tồn tại công khai, được ghi lại rõ ràng thay vì giấu đi, cũng là một cách trung thực để nhắc bản thân rằng sản phẩm nào cũng có phần chưa xong.
