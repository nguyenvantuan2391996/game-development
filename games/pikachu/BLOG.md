# Pikachu (Onet): một bàn cờ mới xáo có thể "chết" ngay từ nước đi đầu tiên mà không ai biết

Game này có một hàm `checkStuck()` khá kỹ lưỡng — sau mỗi lần ghép cặp thành công, nó quét toàn bộ bàn cờ tìm xem còn cặp nào ghép được không, và nếu không còn, tự động mời người chơi xáo bài miễn phí. Cơ chế này chạy đúng, chạy đều đặn, sau mọi nước đi thành công trong suốt ván chơi. Có đúng một thời điểm nó không bao giờ được gọi tới: ngay sau khi bàn cờ vừa được sinh ra, trước nước đi đầu tiên của người chơi. Nếu thuật toán xếp ngẫu nhiên — hoàn toàn không quan tâm tới việc bàn cờ có giải được hay không — vô tình tạo ra một bàn cờ đã "chết" ngay từ đầu, không có gì trong code phát hiện ra điều đó cho tới khi người chơi tự mình nhận ra sau nhiều lần bấm thử.

Pikachu (hay Onet, tuỳ tên gọi theo từng nơi) là game duy nhất trong repo mà toàn bộ giá trị giải trí phụ thuộc vào đúng một thuật toán hình học: kiểm tra xem có thể nối hai ô cùng hình bằng một đường thẳng, một khúc cua, hoặc hai khúc cua hay không. Không có vật lý, không có AI đối thủ, không có phản xạ thời gian thực — chỉ có một bài toán tìm đường trên lưới, được gọi lại hàng trăm lần mỗi ván, mỗi lần click, mỗi lần xin gợi ý, mỗi lần kiểm tra "còn ghép được không".

Đọc lại `getConnectPath`, thuật toán này thử lần lượt bốn dạng đường nối theo đúng độ phức tạp tăng dần:

```javascript
function getConnectPath(a, b) {
  const [r1, c1] = a;
  const [r2, c2] = b;
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;

  if (isPathClear(r1, c1, r2, c2)) return [[r1, c1], [r2, c2]];

  if (isCellEmpty(r1, c2) && isPathClear(r1, c1, r1, c2) && isPathClear(r1, c2, r2, c2)) {
    return [[r1, c1], [r1, c2], [r2, c2]];
  }
  if (isCellEmpty(r2, c1) && isPathClear(r1, c1, r2, c1) && isPathClear(r2, c1, r2, c2)) {
    return [[r1, c1], [r2, c1], [r2, c2]];
  }

  for (let k = -1; k <= columns; k++) {
    if (!isCellEmpty(r1, k) || !isCellEmpty(r2, k)) continue;
    if (!isPathClear(r1, c1, r1, k)) continue;
    if (!isPathClear(r1, k, r2, k)) continue;
    if (!isPathClear(r2, k, r2, c2)) continue;
    return [[r1, c1], [r1, k], [r2, k], [r2, c2]];
  }

  for (let k = -1; k <= rows; k++) {
    if (!isCellEmpty(k, c1) || !isCellEmpty(k, c2)) continue;
    if (!isPathClear(r1, c1, k, c1)) continue;
    if (!isPathClear(k, c1, k, c2)) continue;
    if (!isPathClear(k, c2, r2, c2)) continue;
    return [[r1, c1], [k, c1], [k, c2], [r2, c2]];
  }

  return null;
}
```

Chi tiết tinh tế nhất nằm ở hai vòng lặp `k` chạy từ `-1` tới `columns` (hoặc `rows`) — thay vì `0` tới `columns - 1` như bạn sẽ viết theo bản năng nếu chỉ nghĩ trong phạm vi lưới thật. Hai giá trị biên `-1` và `columns` chính là "vành đai ảo" nằm ngoài bàn cờ, luôn được `isCellEmpty` coi là trống:

```javascript
function isCellEmpty(r, c) {
  if (r < 0 || r >= matrixGame.length || c < 0 || c >= matrixGame[0].length) {
    return true;
  }
  return matrixGame[r][c] === "";
}
```

Chỉ một điều kiện biên là đủ để biến toàn bộ không gian "ngoài bàn cờ" thành vành đai đi được vô hạn — không cần cấp phát thêm bộ nhớ cho một lưới lớn hơn thật, không cần xử lý đặc biệt ở bất kỳ đâu khác. Nhờ vậy, một đường nối hai khúc cua có thể "vòng ra ngoài" bàn cờ hoàn toàn hợp lệ — đúng tinh thần luật gốc, nơi hai quân ở hai góc đối diện của bàn cờ có thể nối được bằng cách vòng qua ngoài rìa, dù nhìn thoáng qua "không có đường nào" nếu chỉ nghĩ trong phạm vi lưới thật. Đây cũng chính là chi tiết dễ bị bỏ sót nhất nếu không nhớ rõ luật gốc — thiếu nó, nhiều cặp quân ở rìa bàn cờ vốn dĩ nối được theo luật Onet thật sẽ bị coi là không nối được.

Điều thú vị hơn nữa là `findHintPair` — hàm cho gợi ý — không cần một thuật toán riêng biệt nào cả. Nó chỉ đơn giản là brute-force mọi cặp cùng hình cho tới khi tìm được cặp đầu tiên mà `getConnectPath`, đúng hàm đã dùng để validate mỗi lượt click, trả về khác `null`:

```javascript
function findHintPair() {
  const rows = matrixGame.length;
  const columns = matrixGame[0].length;
  for (let r1 = 0; r1 < rows; r1++) {
    for (let c1 = 0; c1 < columns; c1++) {
      if (matrixGame[r1][c1] === "") continue;
      for (let r2 = r1; r2 < rows; r2++) {
        for (let c2 = r2 === r1 ? c1 + 1 : 0; c2 < columns; c2++) {
          if (matrixGame[r2][c2] === "") continue;
          if (matrixGame[r1][c1] !== matrixGame[r2][c2]) continue;
          const path = getConnectPath([r1, c1], [r2, c2]);
          if (path) return { a: { r: r1, c: c1 }, b: { r: r2, c: c2 }, path };
        }
      }
    }
  }
  return null;
}
```

Đây cũng là chỗ tạo ra con bug thú vị nhất mình tìm được khi đọc lại toàn bộ file. `checkStuck()` được viết khá kỹ lưỡng:

```javascript
function checkStuck() {
  if (pairsMatched >= pairsTotal) return;
  if (findHintPair()) return;
  showToast("No more matches available!", "Shuffle", () => shuffleBoard(false));
}
```

Nhưng lần theo toàn bộ codebase, hàm này chỉ được gọi từ đúng một nơi: bên trong `handleClick`, ngay sau khi một cặp vừa được ghép thành công (nhánh `else { checkStuck(); }` khi `pairsMatched !== pairsTotal`). Hàm `init()` — nơi `buildMatrix(rows, columns)` sinh ra bàn cờ hoàn toàn mới — không hề gọi `checkStuck()` sau khi dựng xong bảng. Và `buildMatrix` tự nó cũng không có bất kỳ bước kiểm tra hay đảm bảo nào rằng bàn cờ vừa sinh ra còn giải được — nó chỉ rải từng cặp hình vào các ô trống theo thứ tự ngẫu nhiên hoàn toàn, không quan tâm gì tới vị trí có tạo ra được ít nhất một đường nối hợp lệ hay không:

```javascript
function buildMatrix(rows, columns) {
  const totalCells = rows * columns;
  const available = [];
  for (let i = 0; i < totalCells; i++) available.push(i);

  const flat = new Array(totalCells).fill("");
  while (available.length > 0) {
    const imageId = getRandomInt(1, NUM_IMAGES + 1);
    for (let i = 0; i < 2 && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      const cell = available[idx];
      flat[cell] = "images/" + imageId + ".png";
      available.splice(idx, 1);
    }
  }
  // ...
}
```

Hệ quả: về mặt lý thuyết, hoàn toàn có khả năng — dù thống kê cho thấy khá hiếm, nhờ luật nối rất "rộng rãi" qua vành đai ảo, gần như luôn có ít nhất một cặp nối được khi bàn cờ còn đầy — một bàn cờ vừa sinh ra đã không còn cặp nào ghép được, ngay từ trước nước đi đầu tiên. Trong trường hợp đó, người chơi sẽ click thử hết cặp này tới cặp khác, luôn nhận được kết quả "không khớp", mà không có bất kỳ toast thông báo hay lời mời xáo bài nào tự động xuất hiện — vì `checkStuck()` chỉ được kích hoạt sau một lần ghép thành công, và nếu chưa từng có lần ghép thành công nào, nó chưa từng có cơ hội chạy.

Luật nối hai khúc cua qua vành đai ảo cực kỳ rộng rãi, nên khả năng không tồn tại bất kỳ cặp nào trong số hàng trăm cặp có ít nhất một trong bốn dạng đường nối hợp lệ là rất thấp. Nhưng "rất thấp" không phải "bằng không", và không có gì trong code chứng minh được nó bằng không — đây là một giả định chưa được kiểm chứng, không phải một sự thật đã chứng minh. Điều mình rút ra khi tìm thấy chỗ này: một cơ chế "tự phát hiện trạng thái bế tắc" chỉ có giá trị đầy đủ nếu nó được kiểm tra ở mọi thời điểm trạng thái có thể trở nên bế tắc, không chỉ ở những thời điểm dễ nghĩ tới nhất như sau mỗi nước đi. Trạng thái khởi tạo thường bị bỏ sót trong loại kiểm tra này chính vì nó "chưa xảy ra chuyện gì" — trực giác dễ mặc định trạng thái ban đầu luôn ổn, trong khi trên thực tế nó cũng là một trạng thái cần được xác minh như bất kỳ trạng thái nào khác được sinh ra bởi cùng một hàm ngẫu nhiên.

Cách sửa tận gốc không chỉ là vá triệu chứng bằng cách gọi thêm `checkStuck()` (hoặc một biến thể không phụ thuộc `pairsMatched`) ngay sau khi `buildMatrix` hoàn tất trong `init()` — dù đó đã là một bước cải thiện đáng kể. Sửa triệt để hơn sẽ cần một vòng lặp "sinh lại nếu chết" ngay trong `buildMatrix`: sau khi rải xong, gọi `findHintPair()`, nếu trả về `null` thì xáo lại và thử lại, giới hạn số lần thử để tránh vòng lặp vô hạn trong trường hợp cực đoan. Đó là hướng giải quyết vấn đề tận gốc thay vì chỉ phát hiện và mời xáo bài sau khi đã hiển thị một bàn cờ chết cho người chơi thấy.

Pikachu là game duy nhất trong repo mà toàn bộ trải nghiệm phụ thuộc vào đúng một thuật toán hình học được viết đúng — và thuật toán đó, `getConnectPath`, đọc lại hoàn toàn chính xác, kể cả chi tiết tinh vi nhất là vành đai ảo cho đường hai khúc cua. Bug tìm được không nằm ở thuật toán cốt lõi, mà nằm ở một khoảng trống rất con người: một cơ chế bảo vệ được viết ra với đúng ý định tốt, nhưng chỉ được nối dây tới một trong hai thời điểm nó thực sự cần có mặt. Đôi khi lỗ hổng lớn nhất không nằm ở logic phức tạp nhất trong hệ thống, mà nằm ở đúng cái thời điểm "chưa có gì xảy ra" mà không ai nghĩ tới việc cũng cần kiểm tra.
