# Viết lại Audition Online bằng JavaScript thuần: khi "chấm điểm đúng nhịp" khó hơn mình tưởng

Một buổi tối mình đang test mode Beat-up — cái mode có 7 lane chạy song song, mỗi lane một mũi tên trôi tới trôi lui liên tục — tay phải gõ, tay trái lỡ bấm Alt-Tab để xem tin nhắn Discord. Quay lại tab sau đúng hai mươi giây, mình thấy một cảnh tượng kỳ lạ: nhạc vẫn phát, combo vẫn hiện số cũ, nhưng cả bảy mũi tên đứng hình y nguyên vị trí lúc mình rời đi, như bị pause dù chưa bấm phím Esc nào. Bấm thử một phím mũi tên, không phản hồi. Đợi thêm một giây, mũi tên đột ngột nhảy cái rột một đoạn dài rồi mới trôi tiếp bình thường.

Không có gì crash, console cũng sạch — đấy mới là phần đáng sợ. Cái vừa xảy ra là mình chạm đúng cái bẫy kinh điển nhất của rhythm game: đo thời gian bằng số lần một interval được gọi, thay vì đo bằng đồng hồ thực. Cả game Audition này — 3 mode chơi, chấm điểm theo độ chính xác thời gian, một hệ thống chọn nhạc lằng nhằng hơn mình tưởng — được dựng trên đúng cách đo đó, và nó chỉ lộ ra vấn đề ở đúng một tình huống hiếm gặp.

Cách di chuyển mũi tên trong cả ba mode đều giống nhau: một `setInterval` cộng dồn vị trí mỗi lần được gọi.

```javascript
function startMoveLoop() {
  if (intervalID === null) {
    intervalID = setInterval(move, 0);
  }
}

function move() {
  // ...
  pos += increase;
  boxElement.style.left = pos + "px";
}
```

`setInterval(move, 0)` nghe có vẻ chạy "ngay lập tức liên tục", nhưng trình duyệt tự ghim khoảng nghỉ tối thiểu khoảng 4ms, nên trên thực tế `move()` chạy đều đặn hàng trăm lần mỗi giây, mỗi lần cộng 1px. Cách viết này cực kỳ dễ đọc — không delta-time, không lo chia cho zero ở frame đầu — nhưng nó ẩn một giả định ngầm: tốc độ mũi tên phụ thuộc vào tần suất trình duyệt *chịu* gọi `move()`, không phải vào đồng hồ thực. Khi tab đang active, trình duyệt gọi đều, mọi thứ mượt. Nhưng ngay khi tab xuống nền, Chrome và các trình duyệt hiện đại chủ động throttle `setInterval` xuống còn khoảng 1 lần/giây để tiết kiệm pin — trong khi thẻ `<audio>` đang phát thì hoàn toàn không bị giới hạn đó. Nhạc cứ trôi đúng nhịp, mũi tên gần như đứng hình rồi giật cục khi tab được focus lại. Đây là bug mình biết nhưng chưa sửa — đổi sang `requestAnimationFrame` cộng `performance.now()` và lắng nghe `visibilitychange` sẽ giải quyết tận gốc, nhưng chưa đủ ưu tiên vì người chơi hiếm khi Alt-Tab giữa ván.

Một bug khác, tinh vi hơn, nằm ở đúng khoảng hở giữa hai round. Sau khi chốt một chuỗi phím bằng Space, box mũi tên ẩn đi 3 giây trước khi hiện chuỗi mới. Có lúc mình bấm phím mũi tên đúng trong khoảng ẩn đó (phản xạ tự nhiên khi tay đang gõ nhanh), và phím đó vẫn bị so khớp với `listKeyRandom` của chuỗi *vừa kết thúc* — vì chuỗi mới chỉ thực sự được sinh ra sau một `setTimeout` riêng, không phải ngay khi box vừa ẩn. Cách sửa là thêm một cờ đơn giản:

```javascript
// True for the entire 3s gap where the box is hidden between rounds
// (whether the round ended via Space or timed out), so arrow-key presses
// during that gap don't get matched against the still-stale listKeyRandom
// (it isn't regenerated until pos next crosses 1150).
let isBoxHidden = false;

function compareKeyPressAndRandom(key) {
  if (isBoxHidden || listKeyPress.length === listKeyRandom.length) {
    return;
  }
  // ...
}
```

Cái mình thích ở lần sửa này là bản thân comment đã tự kể lại chính xác câu chuyện của bug, không cần đoán lại quá khứ. Bài học ở đây khá phổ quát: bất cứ khi nào có khoảng hở thời gian giữa lúc UI đổi trạng thái và lúc dữ liệu đằng sau thực sự đổi theo, khoảng hở đó là nơi race condition trú ngụ — không cần đồng bộ hai mốc thời gian lại với nhau, chỉ cần một cờ minh bạch để logic biết "đừng tin dữ liệu lúc này" là đủ.

Phần mình thích nhất về mặt thiết kế lại là reverse mode. Nó không đảo ngược toàn bộ chuỗi phím cùng lúc, mà trộn phím thường và phím đảo ngay trong cùng một chuỗi, mỗi phím độc lập được sinh ngẫu nhiên là thường hay đảo. Toàn bộ độ phức tạp đó nằm gọn trong một bảng ánh xạ, không rò rỉ ra logic điều khiển:

```javascript
const LIST_KEY_HAS_REVERSE_4K = [
  "right", "up", "down", "left",
  "right-reverse", "up-reverse", "down-reverse", "left-reverse",
];
const MAP_KEY_4K = new Map([
  ["right", "right"], ["up", "up"], ["down", "down"], ["left", "left"],
  ["right-reverse", "left"], ["up-reverse", "down"],
  ["down-reverse", "up"], ["left-reverse", "right"],
]);
```

Icon hiển thị trên màn hình là icon "reverse" (ví dụ mũi tên phải nhưng lật ngược), nhưng phím bàn phím cần bấm lại là phím ngược lại — tra đúng ngữ nghĩa đó qua `Map`. Hàm `compareKeyPressAndRandom` không cần biết gì về khái niệm "reverse" cả, nó chỉ tra cứu qua bảng, y hệt logic phím thường. Một dạng tách dữ liệu khỏi hành vi khá thoả mãn khi ngồi ngẫm lại — và cũng lý giải vì sao `MAP_KEY_4K` tồn tại ngay từ giai đoạn đầu, dù lúc đó trông có vẻ thừa (ánh xạ mỗi phím về chính nó).

Phần mình đánh giá thấp lúc lên kế hoạch nhưng tốn thời gian ngang ngửa phần gameplay là màn hình chọn nhạc — ba cách chọn nhạc: bài mặc định, tìm trên Jamendo, hoặc lấy file mp3 từ máy. Debug phần Jamendo dạy mình một bài học không ngờ tới: gõ tên một bài hát chắc chắn có, đôi lúc kết quả hiện "Không tìm thấy bài nào", rồi gõ lại y hệt lại ra kết quả bình thường. Log lại chính xác URL và dán vào trình duyệt test độc lập, kết quả vẫn vậy — cùng một URL, gọi 10 lần liên tiếp, khoảng 3 lần trả về mảng rỗng dù dữ liệu chắc chắn tồn tại. Đây không phải lỗi ở phía mình, mà là Jamendo (dịch vụ miễn phí, không SLA) đôi lúc trả rỗng cho chính request giống hệt trước đó. Giải pháp đơn giản là không tin ngay một kết quả rỗng:

```javascript
// Jamendo's API returns an empty result set for a real query surprisingly
// often (~30% of the time in testing, even on identical back-to-back
// requests), so an empty response gets a couple of retries before we
// trust it as "no matches".
let tracks = await fetchJamendoTracks(query);
for (let attempt = 0; attempt < 2 && tracks.length === 0; attempt++) {
  tracks = await fetchJamendoTracks(query);
}
```

Khi tích hợp một API bên thứ ba miễn phí không SLA, "rỗng" và "không tồn tại" là hai khái niệm khác nhau, và code không nên tự động đánh đồng chúng chỉ vì response hợp lệ về mặt HTTP status. Một bug liên quan khác: gõ nhanh một từ khoá rồi sửa lại gần như ngay lập tức, đôi lúc màn hình hiển thị kết quả của từ khoá cũ vì request đó phản hồi chậm hơn nhưng lại về sau. Sửa bằng một số tăng dần đóng vai trò "vé số" cho mỗi lượt tìm kiếm — chỉ request nào cầm đúng số vé mới nhất khi hoàn thành mới được render, không cần `AbortController` nào cả, request cũ cứ để nó tự chạy xong rồi tự nhận ra mình đã lỗi thời.

Không phải quyết định nào cũng đáng tự hào. Hàm `getListKey` — được gọi mỗi khi cần sinh chuỗi phím tiếp theo — có dòng gán một hàm `random` thẳng lên `Array.prototype`, nghĩa là mỗi round mới, code lại ghi đè một hàm dùng chung cho *mọi* mảng trên trang, không chỉ mảng cục bộ trong hàm. May mắn là không có `for...in` nào trên mảng ở đâu trong codebase (mình đã grep kiểm tra), nên nó "vô hình" không phá gì — nhưng đây vẫn là kiểu code chỉ an toàn cho đến khi nó không an toàn nữa, ví dụ ngày nào đó có thêm một thư viện khác cũng lỡ tay định nghĩa `Array.prototype.random`.

Trước khi bắt tay vào, mình nghĩ phần khó nhất của việc viết một rhythm game là công thức chấm điểm — làm sao định nghĩa Perfect, Great, Cool cho đúng cảm giác. Hoá ra một khi đã ngồi vẽ trục số và các khoảng biên trên giấy, phần đó chỉ mất một buổi tối để viết đúng. Cái tốn thời gian thật sự lại nằm ở hai nơi mình không lường trước: đồng bộ hoá thời gian giữa hai luồng độc lập của trình duyệt (nhạc và animation), và xử lý một API bên ngoài cư xử không như tài liệu hứa hẹn. Cả hai đều không phải "lỗi logic" theo nghĩa thông thường — code chạy đúng như nó được viết ra, chỉ là thế giới bên ngoài không hành xử theo đúng giả định ngầm mình đặt ra lúc thiết kế. Phần lớn bug khó nhất hoá ra không nằm trong logic của mình, mà nằm ở ranh giới giữa logic đó và những giả định về thế giới bên ngoài nó.
