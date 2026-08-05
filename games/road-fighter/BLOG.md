# Road Fighter: con đường không cần lưu một điểm nào cả

Trong tất cả các game trong repo này, Road Fighter là game đua xe top-down duy nhất, phỏng theo tựa arcade cùng tên. Phần khiến mình thích nhất khi làm nó không phải là việc lái xe né chướng ngại vật, mà là cách con đường uốn lượn được biểu diễn: không lưu một mảng điểm hay đoạn thẳng nào cả, mà là một hàm sin liên tục theo quãng đường đã đi.

```javascript
function roadCenterForScreenY(screenY, scrollDist) {
    const aheadDist = scrollDist + (GAME_HEIGHT - screenY);
    return GAME_WIDTH / 2 + Math.sin(aheadDist * ROAD_CURVE_FREQ) * ROAD_CURVE_AMPLITUDE;
}
```

Chỉ cần đưa vào một vị trí Y trên màn hình và tổng quãng đường đã cuộn, hàm này trả về ngay tâm đường tại đúng điểm đó — không cần tra bảng, không cần nội suy giữa các waypoint đã lưu sẵn, chỉ một phép `sin`. Muốn vẽ cả con đường, mình chỉ việc gọi hàm này lặp lại cho từng dải ngang của canvas. Muốn biết người chơi có lao ra khỏi đường không, cũng gọi đúng hàm đó tại vị trí Y của xe.

Cái hay hơn nữa là cách xe cộ và bình xăng "dính" vào đúng khúc cua nơi chúng được sinh ra. Thay vì lưu toạ độ Y tuyệt đối, mỗi vật thể lưu một `relativeDistance` — khoảng cách còn lại tới người chơi — và giá trị này giảm dần mỗi khung hình đúng bằng tốc độ xe, y hệt cách `scrollDistance` tăng dần. Vì hai đại lượng này luôn thay đổi cùng một lượng nhưng ngược chiều nhau, tổng của chúng không bao giờ đổi trong suốt vòng đời một vật thể — nghĩa là "điểm trên đường cong" mà chiếc xe địch đó đứng luôn cố định, dù `screenY` của nó thay đổi mỗi khung hình khi cuộn qua màn hình. Không cần đồng bộ tốc độ riêng cho từng vật thể, tốc độ cuộn của cả thế giới tự động khớp với tốc độ người chơi.

Nhiên liệu cũng ăn theo đúng logic đó: tiêu hao tỉ lệ thuận với tốc độ hiện tại so với tốc độ hành trình chuẩn.

```javascript
fuel -= FUEL_DRAIN_PER_SEC * (playerSpeed / CRUISE_SPEED) * dt;
score += playerSpeed * dt * 0.08;
```

Chạy nhanh vừa ghi điểm nhanh hơn, vừa tốn nhiên liệu nhanh hơn — một đánh đổi rủi ro/phần thưởng tự nhiên không cần thêm cơ chế gì đặc biệt, chỉ là hệ quả của việc gắn cả hai công thức vào cùng một biến `playerSpeed`.

Nhưng khi đọc lại `updateWorld` để viết bài này, mình phát hiện ra một chỗ khá tinh vi. Vòng lặp kiểm tra va chạm và ghi điểm vượt xe trông như sau:

```javascript
traffic.forEach((t) => {
    t.relativeDistance -= playerSpeed * dt;
    const screenY = GAME_HEIGHT - t.relativeDistance;
    const carTop = screenY - TRAFFIC_HEIGHT / 2;

    if (!t.scored && carTop > PLAYER_SCREEN_Y + PLAYER_HEIGHT / 2) {
        t.scored = true;
        score += 15;
    }

    if (rectsOverlap(playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT, t.x - TRAFFIC_WIDTH / 2, carTop, TRAFFIC_WIDTH, TRAFFIC_HEIGHT)) {
        triggerGameOver("You crashed into a car!");
    }
});
```

`triggerGameOver` gọi được nhiều lần an toàn nhờ cờ chặn ở đầu hàm (`if (state === "gameover") return;`), nên overlay Game Over không bao giờ hiện chồng lên nhau. Nhưng bản thân `forEach` thì không hề dừng lại khi va chạm xảy ra — `Array.prototype.forEach` trong JavaScript không có cách nào để `break` giữa chừng. Nếu, trong cùng khung hình, một chiếc xe khác đứng sau trong mảng `traffic` vừa vượt qua ngưỡng "đã tránh được", điều kiện `!t.scored && carTop > ...` vẫn đúng, và `score += 15` vẫn chạy — ngay sau khi `triggerGameOver` đã đọc `score` và đóng băng nó thành `finalScore` để hiển thị lên overlay và lưu vào `localStorage`.

Kết quả là biến `score` (dùng để vẽ HUD) và `finalScore` (con số đã đóng băng, hiển thị trên overlay "Game Over") có thể lệch nhau tối đa 15 điểm, trong đúng khung hình xảy ra va chạm. Trên thực tế gần như không ai nhìn thấy được — overlay che kín canvas ngay lập tức, và độ lệch 15 điểm trên một điểm số thường lên tới hàng trăm cũng chẳng đáng để ý. Nhưng cái thú vị nằm ở chỗ: `triggerGameOver` tự bảo vệ đúng phần việc của nó (không hiện overlay hai lần), còn dữ liệu (`score`) thì hoàn toàn không được bảo vệ khỏi các lệnh chạy sau nó trong cùng vòng lặp. Muốn sửa tận gốc chỉ cần đổi `forEach` thành `for...of` để có thể `break` ngay khi phát hiện va chạm — đúng một từ khoá, không cần đổi cấu trúc gì khác. `fuelItems.forEach` chạy ngay sau đó và bước kiểm tra lao ra khỏi đường cũng chịu chung rủi ro tương tự, vì không ai trong số chúng kiểm tra lại `state` trước khi chạy.

Bug này không phải một lỗi làm sập game hay hiện sai giao diện rõ ràng — nó là loại lỗi chỉ lộ ra khi đọc đúng thứ tự các câu lệnh, chứ chơi thử hàng chục lần cũng khó mà nhận ra. Với mình đó là bài học đáng nhớ nhất từ Road Fighter: một hàm "kết thúc trạng thái" có cờ tự vệ tốt vẫn không đủ, nếu vòng lặp gọi nó không tự biết dừng lại.
