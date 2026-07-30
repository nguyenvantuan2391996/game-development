# Bóng Bàn: thêm chế độ 2 người chơi vô tình đưa bàn phím vật lý quay trở lại

## 1. Mở đầu

Toàn bộ các game trong loạt "Brick Game" được viết với một tiêu chí xuyên suốt: phải chơi được bằng ngón tay trên điện thoại, không chỉ bằng bàn phím. Space Impact có D-pad chạm, Rapid Roll có D-pad chạm, Đập Gạch có D-pad chạm — Bóng Bàn cũng vậy, ngay từ bản đầu tiên. Nhưng khi thêm chế độ "2 người chơi cùng bàn phím" vào sau đó, có một hệ quả không thể tránh khỏi mà không ai cố ý thiết kế ra: chế độ đó, đúng theo bản chất của nó, không thể chơi được trên điện thoại — không phải vì thiếu code, mà vì hai người không thể cùng lúc dùng chung một bàn D-pad ảo nhỏ xíu trên một màn hình cảm ứng theo cách hợp lý. Bài này kể về việc thêm một tính năng "hiển nhiên nên có" (đấu 1vs1 cho một game vốn dĩ sinh ra để chơi hai người) lại vô tình đi ngược một tiêu chí thiết kế cốt lõi của cả dự án.

## 2. Bối cảnh

Bóng Bàn là game cuối cùng trong danh sách 5 game "Brick Game" được thêm theo đúng thứ tự yêu cầu (Tetris → Đập Gạch → Bóng Rổ → Đá Bóng → Bóng Bàn). Bản đầu tiên chỉ có một chế độ: người chơi đấu với máy, giống Bóng Rổ và Pocket Carrom đấu với AI trước đó. Nhưng Pong nguyên bản — trò chơi mà Bóng Bàn phỏng theo — vốn dĩ là một game **hai người chơi**, ra đời trước cả khái niệm "chơi với máy tính" trong ngành game. Việc thêm lại chế độ 2 người vào sau, dùng chung bàn phím, gần như là điều tất yếu phải làm để game "trọn vẹn" đúng tinh thần nguyên bản của nó.

## 3. Mục tiêu sản phẩm

**Sẽ làm (bản gốc):**
- Pong dọc cổ điển: vợt trên/dưới, bóng nảy giữa hai vợt, đấu với máy tới 7 điểm.
- Góc nảy phụ thuộc vị trí chạm vợt, tốc độ bóng tăng dần sau mỗi lần chạm.

**Thêm sau đó — chế độ 2 người:**
- Chọn chế độ ngay từ màn hình chính (`mode-grid` với 2 thẻ: 🤖 Đấu với máy / 🧑‍🤝‍🧑 2 người chơi), truyền qua query string `?mode=2p`.
- Người 1 dùng ◀▶ (mũi tên), Người 2 dùng A/D — dùng chung một bàn phím vật lý, ngồi cùng một máy.
- Ẩn D-pad chạm và điểm cao nhất khi ở chế độ 2 người (không có ý nghĩa trong ngữ cảnh 2 người thi đấu trực tiếp), thay bằng một dòng ghi chú hướng dẫn phím.

**Sẽ KHÔNG làm:**
- Không có chế độ 2 người qua mạng — chỉ 2 người ngồi chung một máy, dùng chung một bàn phím.
- Không có cách nào để chơi 2 người trên điện thoại/máy tính bảng — đây là giới hạn thừa nhận, không phải sơ suất (xem phần 7).

MVP (đã mở rộng): chọn chế độ ở màn hình chính, đấu bóng bàn tới 7 điểm, với máy hoặc với người thứ hai cùng bàn phím.

## 4. Thiết kế hệ thống

```mermaid
flowchart TD
    A[home.html<br/>mode-grid: 🤖 hoặc 🧑‍🤝‍🧑] -->|?mode=cpu hoặc ?mode=2p| B[ping-pong.html]
    B --> C[constants.js]
    B --> D[ping-pong-main.js<br/>đọc URLSearchParams ngay dòng đầu]
    D --> E{mode === "2p"?}
    E -->|đúng| F[Cả 2 vợt điều khiển bằng phím<br/>Ẩn D-pad chạm + Best score]
    E -->|sai, mặc định| G[Vợt dưới: người chơi<br/>Vợt trên: AI theo dõi bóng]
    F --> H[updateWorld: nhánh input riêng cho 2p]
    G --> H
    H --> I[Vật lý bóng dùng chung cho cả 2 chế độ]
```

Điểm đáng chú ý nhất trong cách tích hợp chế độ mới là *mức độ tối thiểu* của thay đổi cần thiết — toàn bộ vật lý bóng, va chạm vợt, tính điểm giữ nguyên 100% giữa hai chế độ, chỉ có đúng nhánh input là khác nhau:

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

Ở chế độ đấu máy, phím A/D vẫn điều khiển *vợt của người chơi* (dùng chung với mũi tên, một kiểu điều khiển kép quen thuộc). Ở chế độ 2 người, hai bộ phím tách hẳn ra điều khiển hai vợt độc lập — cùng một biến `keys[...]`, cùng một cấu trúc `if`, chỉ khác cách gán chúng vào vợt nào.

## 5. Tech Stack

| Công nghệ | Vì sao chọn |
| --- | --- |
| **`URLSearchParams` đọc `?mode=` ngay dòng đầu file, trước cả khai báo canvas** | Chế độ chơi cần được biết *trước khi* bất kỳ logic HUD hay input nào khởi tạo (ẩn D-pad, đổi nhãn "Bạn"/"Người 1"), nên đọc query string là việc đầu tiên script làm, không đợi tới khi `startGame()` được gọi. |
| **Biến `cpuPaddle` giữ nguyên tên dù không còn là "vợt của máy" trong chế độ 2p** | Xem phần 8 — tái sử dụng biến có sẵn thay vì đổi tên/thêm biến mới, đánh đổi lấy tốc độ viết code nhưng để lại một khoản nợ đặt tên. |
| **Ẩn hoàn toàn D-pad chạm và khối điểm cao nhất ở chế độ 2p bằng `style.display = "none"` / `hidden`** | Không xoá khỏi DOM, chỉ ẩn — giữ nguyên cấu trúc HTML dùng chung cho cả hai chế độ, tránh phải dựng hai trang riêng biệt cho cùng một trò chơi. |

## 6. Quá trình phát triển

### Giai đoạn 1 (bản gốc) — Pong một người đấu máy

Vợt dưới do người chơi điều khiển, vợt trên là một AI đơn giản theo dõi `ball.x` với vùng chết phản xạ (`CPU_REACTION_DEADZONE`) để không "dán mắt" hoàn hảo vào bóng — một AI hoàn hảo tuyệt đối sẽ không bao giờ thua, làm mất hết ý nghĩa của việc chơi.

### Giai đoạn 2 (thêm sau) — Màn hình chọn chế độ

`home.html` được bổ sung `mode-grid` — hai thẻ bấm chọn, đổi trạng thái `active`, cập nhật hiển thị khối điểm cao nhất (chỉ hiện với chế độ đấu máy, vì "điểm cao nhất" không có ý nghĩa rõ ràng trong một trận 2 người — của ai?). Khi bấm Bắt đầu, URL đích được dựng động theo chế độ đã chọn: `ping-pong.html?mode=${selectedMode}`.

### Giai đoạn 3 (thêm sau) — Tách nhánh input, giữ nguyên vật lý

Phần khó nhất về mặt quyết định (không phải kỹ thuật) là: có nên viết lại toàn bộ file cho chế độ 2 người, hay chỉ thêm một nhánh rẽ vào file đã có? Chọn phương án thứ hai — mọi hàm liên quan tới vật lý bóng, va chạm, tính điểm đều dùng chung tuyệt đối, chỉ `updateWorld` (phần đọc input) và `triggerGameOver`/HUD (phần hiển thị) có nhánh riêng theo `mode`. Nhờ vậy, một bug vật lý bóng (nếu có) sẽ được sửa một lần cho cả hai chế độ, không cần đồng bộ hai bản logic riêng biệt.

## 7. Những bug đáng nhớ

### Không phải bug code — một khoảng trống trải nghiệm bị bỏ sót cho tới khi đọc lại toàn bộ luồng

**Phát hiện khi đọc lại `ping-pong.html` cùng `ping-pong-main.js` để viết bài này:**

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

Ở chế độ 2 người, D-pad chạm bị ẩn hoàn toàn, thay bằng một dòng chữ hướng dẫn dùng phím A/D và mũi tên. Điều này *đúng* về mặt kỹ thuật (không có bug, không có gì bị vỡ) — nhưng nó có nghĩa là **chế độ 2 người, trên một chiếc điện thoại, hoàn toàn không chơi được**: không có bàn phím vật lý, không có D-pad chạm thay thế, chỉ có một dòng chữ hướng dẫn dùng những phím không hề tồn tại trên màn hình cảm ứng. Đây là một khoảng trống tồn tại xuyên suốt toàn bộ dự án — mọi game khác trong repo đều có phương án điều khiển chạm, nhưng tính năng 2-người-chung-bàn-phím lại tái lập chính xác giả định "người chơi có bàn phím vật lý" mà cả loạt game này được sinh ra để phá bỏ.

**Vì sao đây không phải lỗi kỹ thuật:** Bản chất của "2 người dùng chung một bàn phím" vốn dĩ giả định có một bàn phím vật lý để dùng chung — không có bàn phím thì khái niệm "chung bàn phím" không còn ý nghĩa gì để bàn tới nữa. Đây không phải một dòng code viết sai, mà là một giới hạn tồn tại ngay trong chính bản chất của tính năng.

**Điều rút ra:** Một tính năng có thể hoàn toàn "đúng" theo đúng phạm vi nó tự đặt ra (2 người, cùng bàn phím, cùng máy) nhưng vẫn tạo ra một khoảng trống khi đặt cạnh một tiêu chí thiết kế rộng hơn của cả dự án (mọi thứ phải chơi được trên điện thoại). Không có "bug" cụ thể nào để trỏ vào và sửa — chỉ có một câu hỏi thiết kế chưa có lời giải: nếu muốn 2 người cùng chơi trên một điện thoại, cơ chế điều khiển cần được nghĩ lại hoàn toàn (ví dụ chia đôi màn hình thành hai vùng chạm trái/phải cho mỗi người), không chỉ đơn giản là ẩn D-pad và hiện dòng chữ hướng dẫn.

## 8. Những quyết định sai

**Biến `cpuPaddle` vẫn giữ nguyên tên dù ở chế độ 2 người nó không còn liên quan gì tới "máy" cả — nó là vợt của Người 2.** Đọc code ở chế độ 2p, dòng `if (keys.d || keys.D) cpuPaddle.x += PLAYER_SPEED * dt;` yêu cầu người đọc tự nhớ "à, trong ngữ cảnh này, `cpuPaddle` thực ra là vợt người thật" — một khoản nợ đặt tên nhỏ nhưng có thật, sinh ra từ việc ưu tiên tái sử dụng biến có sẵn hơn là đổi tên nhất quán (`topPaddle`/`bottomPaddle` sẽ trung lập và đúng ngữ nghĩa hơn ở cả hai chế độ).

**Không có cách nào để chơi 2 người trên một thiết bị cảm ứng**, như đã phân tích ở phần 7 — dù đây là giới hạn có thể chấp nhận được (2 người ngồi cạnh nhau bấm chung một bàn phím máy tính vẫn là kịch bản sử dụng hợp lý), nó không được ghi nhận rõ ràng ở bất kỳ đâu trong tài liệu game như một giới hạn *có chủ đích*, dễ bị hiểu nhầm là thiếu sót nếu ai đó chỉ đọc mô tả "2 người chơi" mà không biết trước cần bàn phím vật lý.

## 9. Những điều học được

- **Tái sử dụng logic dùng chung (vật lý, va chạm, tính điểm) khi thêm một chế độ chơi mới giúp giảm hẳn rủi ro tạo ra hai phiên bản logic lệch nhau** — chỉ nhánh input và hiển thị cần tách riêng, phần "luật chơi cốt lõi" luôn nhất quán.
- **Một tính năng đúng trong phạm vi hẹp của chính nó (2 người, cùng bàn phím) vẫn có thể tạo ra khoảng trống khi đặt cạnh tiêu chí rộng hơn của cả sản phẩm** — không phải mọi khoảng trống như vậy đều cần sửa ngay, nhưng đều đáng được *nhận diện và ghi nhận rõ ràng* thay vì để nó âm thầm tồn tại cho tới khi ai đó tình cờ phát hiện.
- **Tái sử dụng tên biến từ chế độ cũ cho một ngữ nghĩa mới trong chế độ mới là một cách tiết kiệm thời gian ngắn hạn nhưng để lại phí đọc hiểu dài hạn** — nhất là khi tên biến đó (`cpuPaddle`) mang hàm ý sai lệch rõ ràng ("máy") trong đúng ngữ cảnh mới mà nó được dùng.

## 10. Kết quả

| Hạng mục | Con số |
| --- | --- |
| Tổng số dòng code (JS + CSS + HTML) | 821 dòng |
| `js/ping-pong-main.js` | 281 dòng |
| `css/ping-pong.css` | 221 dòng |
| `css/home.css` | 173 dòng |
| `js/ping-pong-home.js` | 33 dòng |
| `js/constants.js` | 21 dòng |
| Số chế độ chơi | 2 (đấu máy, 2 người cùng bàn phím) |
| Test tự động | 0 |
| CI/CD | Không có |

## 11. Nếu làm lại từ đầu

- **Đổi tên `cpuPaddle` thành một tên trung lập** (`topPaddle` hoặc `opponentPaddle`) áp dụng cho cả hai chế độ, xoá bỏ khoản nợ đặt tên đã ghi nhận ở phần 8.
- **Thiết kế một sơ đồ điều khiển chạm riêng cho chế độ 2 người** — ví dụ chia canvas thành nửa trên/nửa dưới, mỗi nửa nhận thao tác vuốt trái/phải của một người, thay vì chỉ đơn giản ẩn D-pad và giả định người chơi luôn có bàn phím.
- **Ghi rõ trong mô tả chế độ ở màn hình chính rằng "2 người chơi" yêu cầu bàn phím vật lý**, thay vì chỉ ẩn thầm lặng D-pad khi vào trong game — để người chọn chế độ trên điện thoại biết trước, thay vì phát hiện ra sau khi đã bắt đầu ván.

## 12. Kết

Thêm chế độ 2 người vào Bóng Bàn là một quyết định gần như hiển nhiên — Pong sinh ra để chơi hai người, và phần lớn công sức kỹ thuật để làm việc đó (tách nhánh input, giữ nguyên vật lý) diễn ra suôn sẻ, không phát sinh bug nào đáng kể. Điều thú vị hơn cả nằm ở một hệ quả không ai chủ đích tạo ra: một tiêu chí thiết kế xuyên suốt cả dự án ("chơi được trên điện thoại") và một tính năng đúng đắn trong phạm vi riêng của nó ("2 người dùng chung bàn phím") hoá ra xung khắc nhau ở đúng một điểm không thể dung hoà bằng cách chỉnh sửa nhỏ. Không phải mọi câu hỏi thiết kế đều có một câu trả lời đúng chờ sẵn để tìm ra — có những câu hỏi chỉ đơn giản là chưa có lời giải, và việc nhận ra điều đó cũng là một kết quả có giá trị của việc ngồi đọc lại code với đủ sự tò mò.
