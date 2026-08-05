# Tank 1990: một điều kiện thắng thua không bao giờ có cơ hội tự mình quyết định điều gì

Có đúng hai nơi trong code Tank 1990 kiểm tra "cứ điểm đã bị phá huỷ chưa": một nằm ngay trong hàm xử lý va chạm đạn, gọi `triggerGameOver` ngay tại khoảnh khắc viên đạn phá vỡ ô cứ điểm cuối cùng; một nằm ở cuối vòng lặp chính, đọc lại `map.baseAlive` sau khi mọi thứ khác trong khung hình đã cập nhật xong, rồi cũng gọi `triggerGameOver`. Đọc lướt qua, đây trông như một lớp bảo hiểm hợp lý — "phòng khi" nơi thứ nhất bỏ sót. Nhưng khi mình lần theo toàn bộ codebase để viết bài này, `baseAlive` chỉ có đúng một chỗ duy nhất từng gán giá trị `false`, và chỗ đó nằm ngay trong đường thực thi dẫn tới lệnh gọi thứ nhất. Lớp bảo hiểm thứ hai không phải "phòng khi" — nó là một con đường không bao giờ được đi qua khác với con đường đã đi qua trước đó.

Tank 1990 là bản clone Battle City, và tính tới thời điểm viết game này, nó là game phức tạp nhất trong repo xét về số lượng thực thể tương tác cùng lúc: một bản đồ 13×13 ô có thể bị phá huỷ từng phần, tối đa 4 xe tăng địch cùng lúc trên sân cộng một boss, đạn từ cả hai phía, và một cứ điểm cần bảo vệ. Đây cũng là game đầu tiên trong repo mình tách thành nhiều file class riêng biệt (`TileMap`, `Bullet`, `Tank`) thay vì gói mọi thứ trong một file `*-main.js` duy nhất — độ phức tạp của bài toán đủ lớn để việc tách file trở thành lựa chọn hợp lý, không còn là chuyện phong cách nữa. `TileMap` không biết gì về xe tăng, `Tank` không biết gì về bản đồ, mọi phối hợp — ai va chạm với ai — nằm gọn trong vòng lặp chính.

Quay lại chuyện `baseAlive`. Chỉ có đúng một nơi trong toàn bộ codebase gán giá trị này thành `false`:

```javascript
// tile-map.js — damageTile()
if (t === TILE_BASE) {
    this.grid[row][col] = TILE_EMPTY;
    this.baseAlive = false;
    return "base";
}
```

Và `damageTile` chỉ được gọi từ đúng một nơi:

```javascript
// tank-1990-main.js — updateBullets()
if (map.isSolidForBullet(col, row)) {
    const result = map.damageTile(col, row);
    b.alive = false;
    if (result === "base") triggerGameOver("Base destroyed!");   // (1)
}
```

Nghĩa là ngay tại khoảnh khắc `baseAlive` chuyển thành `false`, `triggerGameOver` đã được gọi trực tiếp ở dòng (1), trong cùng một lệnh gọi hàm. Điều kiện thứ hai, nằm ở cuối vòng lặp chính:

```javascript
// tank-1990-main.js — loop()
if (map.baseAlive === false && state === "playing") {
    triggerGameOver("Base destroyed!");    // (2)
}
```

...luôn chạy *sau* dòng (1) trong cùng khung hình đó, vì `updateBullets()` được gọi trước điều kiện này trong thân `loop()`. Và tại thời điểm đó `state` đã là `"gameover"` rồi — điều kiện `state === "playing"` ở dòng (2) đã sai, nên nhánh này không bao giờ thực sự gọi `triggerGameOver` với ý nghĩa mới. Ngay cả trong giả thuyết nó bị gọi hai lần, bản thân `triggerGameOver` đã có `if (state === "gameover") return;` tự vệ ở đầu, nên dòng (2) không gây hại gì — nhưng nó cũng chưa từng, và với cấu trúc hiện tại sẽ không bao giờ, là con đường *đầu tiên* dẫn tới kết thúc game vì cứ điểm bị phá.

Điều làm mình dừng lại suy nghĩ là: vì sao trường hợp này khác với một tình huống tương tự mình từng gặp ở Tetris, nơi một nhánh phòng thủ tương tự (`br < 0` trong hàm va chạm) là code chưa kích hoạt nhưng vẫn đáng giữ lại, vì nó có thể được kích hoạt nếu một quyết định thiết kế khác (vị trí spawn khối) thay đổi trong tương lai? Ở Tank 1990 thì không có con đường hợp lý nào khác có thể khiến `baseAlive` chuyển thành `false` ngoài đúng lệnh gọi `damageTile` duy nhất đã có, trừ khi ai đó thêm hẳn một cơ chế phá cứ điểm hoàn toàn mới, ví dụ va chạm trực tiếp của xe tăng chứ không qua đạn. Cho tới khi điều đó xảy ra, dòng (2) là mã lặp thực sự, không phải lưới an toàn cho một kịch bản tương lai cụ thể nào.

Bài học ở đây là: không phải mọi điều kiện kiểm tra trùng lặp đều mang cùng một ý nghĩa. Có loại là lưới an toàn cho một đường đi khác trong tương lai, đáng giữ lại. Có loại là kiểm tra lại một điều kiện chỉ có thể đúng thông qua đúng một con đường đã được xử lý trước đó rồi, không mang thêm giá trị nào. Phân biệt được hai loại này đòi hỏi lần theo *toàn bộ* nơi một biến trạng thái được ghi, không chỉ đọc riêng lẻ từng chỗ nó được kiểm tra.

Một chi tiết nhỏ khác mình để ý khi đọc lại `Tank`: `player.alive` được khởi tạo `true` trong constructor và không bao giờ bị đặt lại `false` ở bất kỳ đâu, khác với `enemy.alive`/`boss.alive` — cả hai đều được đặt `false` đúng lúc bị tiêu diệt. Vì `render()` chỉ vẽ khi `player && player.alive`, và điều kiện đó luôn đúng, trường `alive` trên đối tượng `player` trở thành một trường không bao giờ đổi giá trị. Vô hại — không gây lỗi hiển thị, vì màn hình Game Over che phủ toàn bộ canvas qua overlay — nhưng là một sự bất đối xứng nhỏ giữa ba loại xe tăng dùng chung một class: hai loại tuân theo đúng vòng đời `alive: true → false`, một loại thì không.

Còn một chi tiết gameplay đáng nhắc vì nó không phải bug mà là một quyết định thiết kế tinh tế: AI địch đổi hướng đi ngẫu nhiên theo hẹn giờ, *nhưng cũng đổi hướng ngay khi bị chặn đường*. Thiếu chi tiết đó, một xe tăng địch hoàn toàn có thể chọn ngẫu nhiên đúng hướng đối diện một bức tường và đứng yên tại chỗ cho tới khi hết thời gian, trông rất "ngu" và phá vỡ ảo giác về một AI đang cố gắng di chuyển — dù bản thân AI vẫn hoàn toàn ngẫu nhiên, không có bất kỳ pathfinding thực sự nào.

Nhìn lại, Tank 1990 là game phức tạp nhất về kiến trúc trong repo tính tới lúc viết bài này, và đúng như dự đoán với độ phức tạp đó, phần lớn logic đọc lại đều đúng và nhất quán — không có bug va chạm hay AI nào lộ ra khi soát lại. Điều thú vị nhất tìm được lại là một dạng "phi-bug" tinh tế: một điều kiện kiểm tra trông như một lớp bảo hiểm hợp lý, nhưng khi lần theo tới tận cùng vòng đời của biến nó kiểm tra, hoá ra chưa từng — và về mặt cấu trúc hiện tại, không thể — có cơ hội tự mình là nguyên nhân dẫn tới bất kỳ kết quả nào khác với con đường đã luôn xảy ra trước nó.
