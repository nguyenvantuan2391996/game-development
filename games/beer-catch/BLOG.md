# Hứng Bia: chiếc ly có một dải hộp vô hình không thuộc về nó

Ly bia trong game này được vẽ bằng hai phần: một thân ly hình chữ nhật, và một quai cầm hình vòng cung nhô ra bên phải. Nhìn qua tưởng đơn giản — nhưng khi mình đặt cạnh vùng va chạm thực sự dùng để tính "đã hứng được đồ vật hay chưa", có một khoảng hở khoảng 10px ở rìa phải, nơi không có phần nào của ly được vẽ ra, nhưng vẫn được tính là "trong tầm với" của chiếc ly. Phát hiện này không đến từ lúc chơi thử — nó đến từ lúc mình ngồi đọc lại chính code của mình với con mắt của người lần đầu nhìn thấy nó.

Hứng Bia không nằm trong loạt "Nokia hoài niệm" hay "Brick Game" — nó đứng riêng, nhưng dùng đúng bộ khung kỹ thuật đã thành chuẩn chung của cả repo: canvas, IIFE, state machine `ready/playing/gameover`, HUD dạng chip, D-pad chạm. Cơ chế: một chiếc ly di chuyển ngang ở đáy màn hình, hứng những cốc bia rơi từ trên xuống để ghi điểm (bia vàng cho điểm cao hơn nhưng hiếm hơn), né những vật thể xấu — đánh dấu bằng hai đường chéo đỏ kiểu biển cấm — rơi cùng lúc. Nhìn cách đặt tên hàm (`difficultyStep`, `rectsOverlap`) và công thức nhấp nháy bất tử (`Math.floor(performance.now() / 100) % 2 === 0`), có thể thấy rõ đây là game được viết dựa trên đúng khuôn mẫu đã hình thành từ Space Impact trước đó trong repo, chỉ đổi chủ đề và đơn giản hoá vật thể rơi.

Bug lộ ra khi mình đối chiếu phần vẽ (`drawPlayer`) với phần va chạm (`updateWorld`) cạnh nhau:

```javascript
// Vẽ: thân ly chỉ rộng PLAYER_WIDTH - 14, lệch về bên trái
ctx.fillRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2, PLAYER_WIDTH - 14, PLAYER_HEIGHT);
// Vẽ: quai cầm là một cung tròn bán kính 10, tâm tại (PLAYER_WIDTH/2 - 20, 0)
ctx.arc(PLAYER_WIDTH / 2 - 20, 0, 10, -Math.PI / 2, Math.PI / 2);
```

```javascript
// Va chạm: dùng TRỌN VẸN PLAYER_WIDTH, không trừ đi phần nào
const playerLeft = playerX - PLAYER_WIDTH / 2;
rectsOverlap(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT, ...);
```

Với `PLAYER_WIDTH = 74`, thân ly được vẽ trải dài từ `x = -37` tới `x = 23` (rộng `74 - 14 = 60`, không phải `74`). Quai cầm — cung tròn tâm tại `x = 17`, bán kính 10 — vươn xa nhất tới `x = 27`. Cộng thêm độ dày nét vẽ (`lineWidth = 5`, khoảng 2.5px mỗi bên), điểm xa nhất mà bất kỳ phần nào của ly thực sự được vẽ ra màn hình chỉ tới khoảng `x ≈ 29.5`. Trong khi đó vùng va chạm dùng nguyên `PLAYER_WIDTH = 74`, trải dài tới tận `x = +37`. Kết quả là có một dải rộng 7-10px ở rìa phải của ly — nằm trong vùng va chạm nhưng hoàn toàn trống về mặt hình ảnh — nơi bia hoặc vật xấu rơi vào đó vẫn tính là "chạm ly" dù mắt thường nhìn thấy chúng rơi qua khoảng trống bên phải, chưa chạm vào bất kỳ hình khối nào được vẽ ra.

Với vật thể tốt, đây là một món quà nhỏ vô tình — dễ hứng hơn ly trông có vẻ. Với vật thể xấu, nó là một hình phạt vô tình — mất mạng dù cảm giác rõ ràng đã né được. 7-10px trên một chiếc ly rộng 74px là một chênh lệch khá nhỏ, và vì nó nằm ở cả hai phía (vừa lợi cho vật thể tốt vừa hại với vật thể xấu), tác động ròng lên cảm giác công bằng một phần tự triệt tiêu lẫn nhau, dù không hoàn toàn. Điều rút ra ở đây khá rõ: khi một hình vẽ không đối xứng (thân lệch trái, quai nhô phải nhưng không đủ xa) được gán một vùng va chạm hình chữ nhật đối xứng hoàn hảo tính theo đúng biến `PLAYER_WIDTH`, sự lệch pha giữa "cái người chơi nhìn thấy" và "cái code thực sự kiểm tra" không tự động bằng 0 chỉ vì cả hai cùng dùng chung một hằng số kích thước. Phải đo đạc cụ thể từng phần được vẽ ra, không chỉ đọc tên biến, mới phát hiện được độ lệch thực tế.

Có một quyết định khác đáng nhắc tới, không hẳn là bug mà là một đánh đổi lặp lại xuyên suốt cả repo: vật thể rơi được vẽ dạng hình tròn nhưng va chạm lại kiểm tra dạng hình vuông bao quanh nó.

```javascript
const playerLeft = playerX - PLAYER_WIDTH / 2;
const playerTop = PLAYER_Y - PLAYER_HEIGHT / 2;

rectsOverlap(
    playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
    item.x - BEER_SIZE / 2, item.y - BEER_SIZE / 2, BEER_SIZE, BEER_SIZE
);
```

Một hình vuông ngoại tiếp một hình tròn có diện tích lớn hơn khoảng 27%, và bốn góc vuông nhô ra xa tâm hơn bán kính hình tròn tới `√2` lần — nghĩa là vật thể "trông tròn" trên màn hình nhưng có thể được hứng hoặc né trúng ngay tại các góc vô hình nằm ngoài rìa tròn nhìn thấy được. Mình từng dùng đúng đơn giản hoá này cho đạn và địch ở Space Impact, nên nó là một mẫu hình lặp lại có chủ đích trong repo hơn là lỗi riêng của game này — nhưng ở Hứng Bia, nơi kỹ năng chính của người chơi là căn chỉnh vị trí ly chính xác theo mắt nhìn, độ lệch hình-học-vs-hitbox này ảnh hưởng trực tiếp hơn tới cảm giác công bằng so với các game khác nơi va chạm chỉ là một phần trong nhiều cơ chế.

Một chi tiết thiết kế mình thấy hợp lý khi đọc lại: hai luồng sinh vật thể (bia và vật xấu) hoàn toàn độc lập với nhau, không có bất kỳ sự phối hợp nào giữa "khi nào bia rơi" và "khi nào vật xấu rơi" — chúng chỉ tình cờ chồng lên nhau hay không tuỳ may rủi. Một hệ thống điều phối hai luồng để tránh hoặc tạo tình huống rơi cùng lúc phức tạp hơn nhiều so với lợi ích nó mang lại cho một game có cơ chế cốt lõi đơn giản như thế này, nên việc để chúng độc lập là lựa chọn đúng.

Hứng Bia là một ví dụ rõ ràng cho một loại lỗi không hề ồn ào: không crash, không hiện sai điểm số, không có gì trong console phàn nàn — chỉ có một cảm giác mơ hồ "hình như mình vừa né được mà vẫn mất mạng" mà không ai, kể cả người viết code, chắc chắn xác nhận được nếu không ngồi đo lại từng con số. Đọc một game mình đã viết từ lâu với sự tò mò thay vì niềm tin rằng nó đúng cũng là một cách hữu ích để bắt được đúng loại lỗi này — loại lỗi chỉ lộ ra khi ai đó thực sự dừng lại so sánh cái được vẽ với cái được kiểm tra, hai thứ tưởng chừng luôn đi cùng nhau nhưng không có gì đảm bảo điều đó ngoài kỷ luật của người viết.
