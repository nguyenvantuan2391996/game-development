# Bắn Ruồi: khi "game không chạy" hoá ra không phải lỗi của game

Bấm nút Bắt đầu, overlay biến mất đúng như mong đợi — nhưng sau đó thì không có gì xảy ra nữa. Không con ruồi nào xuất hiện. Đồng hồ đếm ngược đứng yên ở "45s" dù đã đợi hai giây, rồi ba giây, rồi tám giây. Không có dòng lỗi nào trong console. `overlay.hidden` đã đúng là `true`. Mọi thứ trông như đã chạy, nhưng game state thì đóng băng hoàn toàn. Đây là lúc một buổi debug thông thường — đọc lại code, tìm chỗ viết sai — không giúp được gì, vì code không hề sai.

Bắn Ruồi ra đời sau loạt game "Nokia hoài niệm", khi được yêu cầu thêm một game bắn ruồi đơn giản: côn trùng bay ngẫu nhiên trong khung hình, đổi hướng định kỳ, chạm vào để bắn hạ trong 45 giây, tránh ong vàng (trừ điểm), ưu tiên ruồi vàng (điểm cao nhưng biến mất nhanh). Về mặt code đây là game đơn giản nhất trong cả loạt — không vật lý nảy phức tạp, không AI, một vòng lặp `requestAnimationFrame` chuẩn giống hệt khuôn mẫu đã dùng cho mọi game canvas khác trong repo. Nên khi nó "không chạy" trong lúc kiểm tra bằng trình duyệt thật, phản xạ đầu tiên là nghi ngờ vòng lặp game viết sai đâu đó — một game đơn giản như vậy thì còn gì để sai nữa?

Debug từng bước một. Đầu tiên là kiểm tra console lỗi — không có gì, không exception nào bị ném ra. Tiếp theo là nghi ngờ `startGame()` không thực sự chạy tới dòng `requestAnimationFrame(loop)` cuối hàm — gọi trực tiếp nút bấm qua console rồi kiểm tra lại `overlay.hidden`: vẫn `true`, nghĩa là `startGame()` đã chạy trọn vẹn. Vậy `loop()` có được gọi lần đầu không? Vấn đề là `loop()` nằm trong một closure IIFE, không gọi trực tiếp từ console được. Cách xác minh là viết một bài test hoàn toàn độc lập với code của game:

```javascript
window.__rafCount = 0;
function tick() { window.__rafCount++; requestAnimationFrame(tick); }
requestAnimationFrame(tick);
```

Đợi ba giây, đọc lại `window.__rafCount` — kết quả là 0. Không phải một con số nhỏ, không phải bị "chậm" — đúng nghĩa `requestAnimationFrame` chưa từng gọi lại hàm `tick` một lần nào, dù đã lên lịch. Kiểm tra `document.hidden` và `document.visibilityState` thì cả hai xác nhận tab đang ở trạng thái `hidden`. Đây chính là câu trả lời: các trình duyệt hiện đại tạm dừng hoàn toàn `requestAnimationFrame` — không chỉ giảm tần suất như `setInterval` — cho các tab không hiển thị trên màn hình, để tiết kiệm tài nguyên. Một hành vi chuẩn hoá, không phải bug của trình duyệt.

Để chắc chắn đây không phải lỗi riêng của Bắn Ruồi, mình quay lại mở một game khác trong repo — đã từng chạy mượt mà trong lần kiểm tra trước đó cùng phiên làm việc — và lặp lại đúng bài test: `document.hidden` cũng trả về `true`. Cùng một hiện tượng, xảy ra ở một game hoàn toàn khác, xác nhận đây là vấn đề ở tầng trình duyệt hoặc công cụ tự động hoá đang điều khiển tab, không nằm trong logic của bất kỳ game nào. Công cụ dùng để kiểm tra các game trong phiên này điều khiển một tab không thật sự nằm ở tiền cảnh của hệ điều hành tại thời điểm đó — dù vẫn nhận được lệnh và chụp được ảnh màn hình bình thường (cơ chế chụp ảnh không phụ thuộc vào việc tab có "visible" theo đúng nghĩa Page Visibility API hay không). Theo đúng spec, `requestAnimationFrame` không bao giờ được gọi lại cho một tài liệu ở trạng thái `hidden`.

Không có gì để "sửa" trong code của game — đây không phải bug của Bắn Ruồi. Cách xác minh thay thế là gọi trực tiếp các hàm xử lý sự kiện (mô phỏng `pointerdown` bằng `PointerEvent` thật gửi vào đúng phần tử DOM) để kiểm tra logic game hoạt động đúng mà không phụ thuộc vào việc `requestAnimationFrame` có được trình duyệt gọi lại trong môi trường kiểm tra hay không. Điều rút ra: khi một hiện tượng "im lặng" — không lỗi, không crash, chỉ đơn giản là không có gì xảy ra — xuất hiện, phản xạ đầu tiên thường là đọc lại chính đoạn code đang nghi ngờ. Nhưng cách xác nhận nhanh và đáng tin hơn là cô lập biến số: viết một bài test hoàn toàn không phụ thuộc vào code của game để trả lời câu hỏi "vấn đề nằm trong logic của tôi, hay trong môi trường đang chạy nó?" trước khi tốn thời gian dò từng dòng code không có tội.

Ngoài câu chuyện debug đó ra, phần code đáng nói nhất trong game là cách xử lý va chạm khi bắn. Khi người chơi chạm vào canvas, game duyệt danh sách côn trùng theo thứ tự ngược:

```javascript
canvas.addEventListener("pointerdown", (e) => {
    if (state === "ready" || state === "gameover") {
        startGame();
        return;
    }
    const pos = canvasPosFromEvent(e);
    for (let i = insects.length - 1; i >= 0; i--) {
        const insect = insects[i];
        if (dist(pos.x, pos.y, insect.x, insect.y) <= insect.radius + CLICK_TOLERANCE) {
            killInsect(insect);
            break;
        }
    }
});
```

Côn trùng vẽ sau nằm "trên" côn trùng vẽ trước về mặt hình ảnh, vì canvas vẽ chồng theo đúng thứ tự trong mảng. Khi hai con côn trùng lặp vị trí, duyệt ngược từ `insects.length - 1` xuống `0` đảm bảo con bị bắn trúng là con người chơi thực sự nhìn thấy ở trên cùng, không phải con bị che khuất phía dưới — một chi tiết nhỏ nhưng nếu duyệt xuôi thì người chơi sẽ có cảm giác "bắn trúng con ruồi nhưng game tính là trượt", một loại bug khó chịu vì cảm giác sai lệch giữa mắt nhìn thấy và game logic.

Lớp phản hồi thị giác cũng đáng nhắc vì cách tận dụng lại đúng một công thức cho hai hiệu ứng khác nhau: hạt văng ra khi bắn trúng và chữ điểm số bay lên đều fade theo cùng một công thức `alpha = life / maxLife`:

```javascript
function killInsect(insect) {
    insect.alive = false;
    score = Math.max(0, score + insect.def.score);
    const label = insect.def.score >= 0 ? `+${insect.def.score}` : `${insect.def.score}`;
    const textColor = insect.def.score >= 0 ? "#4dff88" : "#ff5252";
    spawnParticles(insect.x, insect.y, insect.def.color);
    spawnFloatingText(insect.x, insect.y, label, textColor);
}
```

Điểm số cũng được kẹp về 0 ngay tại chỗ cộng điểm (`Math.max(0, score + insect.def.score)`), nên nếu người chơi lỡ chạm phải ong vàng liên tục, điểm không bao giờ hiển thị số âm — một chi tiết nhỏ giúp UI không cần xử lý trường hợp "điểm âm" ở bất kỳ đâu khác trong code.

Nhìn lại toàn bộ quá trình, bài học lớn nhất không nằm ở game logic — phần đó thực ra khá gọn và đúng ngay từ đầu — mà nằm ở việc "im lặng, không lỗi" không đồng nghĩa với "mọi thứ ổn". Đôi khi nó chỉ có nghĩa là vấn đề nằm ở một tầng mình chưa nghĩ tới soi: không phải trong vòng lặp game, không phải trong hàm xử lý va chạm, mà trong chính cái giả định ngầm rằng trình duyệt sẽ luôn gọi lại `requestAnimationFrame` đều đặn như đã hứa. Giả định đó đúng gần như mọi lúc một người chơi thật sự mở game — chỉ sai trong đúng môi trường đang được dùng để kiểm tra nó, một nghịch lý nhỏ nhưng đáng nhớ, và là lý do từ giờ mình sẽ luôn có sẵn một bài test `requestAnimationFrame` độc lập trong túi trước khi nghi ngờ code của chính mình.
