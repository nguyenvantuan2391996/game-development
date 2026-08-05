# Pocket Carrom: khi "kéo rồi thả là bắn" hoá ra là một ý tưởng tồi trên điện thoại

Bản đầu tiên của Pocket Carrom chỉ có đúng một cách bắn: kéo quân cái ra xa theo hướng ngược với hướng muốn bắn, thả tay ra là viên bi lập tức lao đi — y hệt cơ chế ná thun quen thuộc trong vô số game mobile. Trên chuột máy tính, cách này mượt và trực quan. Nhưng nó có một lỗ hổng chỉ lộ ra khi mình nghĩ nghiêm túc tới ngón tay thật trên màn hình cảm ứng: ngón tay che mất đúng điểm đang kéo, và một khi đã nhấc tay lên là viên bi đã bay mất — không có cơ hội "à khoan, chỉnh lại lực một chút" trước khi bắn thật. Bản mới nhất của game này không còn bắn ngay khi thả tay nữa — kéo giờ chỉ để ngắm, một thanh trượt riêng để chỉnh lực, và một nút "BẮN" riêng để xác nhận.

Pocket Carrom là game thứ ba trong loạt "máy Nokia hoài niệm" của mình — sau Space Impact và Rapid Roll — nhưng khác hẳn hai game trước ở một điểm: đây không phải remake trực tiếp một game cầm tay cụ thể, mà là bàn cờ carrom vật lý thật, người chơi đấu với máy qua từng lượt bắn xen kẽ. Nó cũng là game vật lý phức tạp nhất trong cả loạt tính đến thời điểm đó — không chỉ một quả bóng nảy tường như Rapid Roll, mà 19 quân cờ (18 quân thường + 1 hậu đỏ) cộng một quân cái, tất cả có thể va chạm chồng chéo lẫn nhau trong cùng một cú bắn.

Điểm khác biệt lớn nhất so với thiết kế ban đầu nằm ở chỗ tách rời hoàn toàn "aim" (ngắm) khỏi "fire" (bắn), thể hiện ngay trong comment đầu file:

```javascript
// Aiming is decoupled from firing: dragging the striker (or the power
// slider) only updates the locked-in aim/power; the shot only actually
// fires when the "Bắn" button is pressed. This gives touch players a
// second, more forgiving chance to fine-tune power before committing,
// instead of having to nail direction+power in one continuous drag.
let aimReady = false;
let aimDirX = 0;
let aimDirY = -1;
let shotPower = 0.5;
```

`pointerup` trên canvas giờ không còn set vận tốc trực tiếp — nó chỉ tính `aimDirX`/`aimDirY`/`shotPower` từ vector kéo rồi bật cờ `aimReady = true`, đồng bộ giá trị lên thanh trượt. Vận tốc thật sự chỉ được gán vào `striker.vx`/`striker.vy` bên trong `fireShot()` — hàm duy nhất gắn với sự kiện click của nút Bắn. Người chơi có thể kéo lại nhiều lần, chỉnh slider, nhìn kỹ đường ngắm màu theo mức lực trước khi thật sự cam kết. Đây là giai đoạn đáng kể nhất trong quá trình làm game, xảy ra sau khi bản đầu tiên đã chạy hoàn chỉnh — không sửa vì có bug, mà vì trải nghiệm chạm chưa đủ tốt.

Phần vật lý cốt lõi cũng đáng nói. Ba hàm độc lập làm nền: `applyFriction` giảm tốc tuyến tính (không theo tỉ lệ phần trăm, để mọi quân dừng lại sau cùng một khoảng thời gian xấp xỉ bất kể tốc độ ban đầu), `handlePocketsAndWalls` kiểm tra rơi lỗ trước rồi mới phản xạ tường — thứ tự này quan trọng, vì một quân gần rơi lỗ không nên bị "bật" ngược lại bởi luật tường — và `resolveCollision` tách vị trí chồng lấn theo tỉ lệ khối lượng nghịch đảo rồi cộng xung lượng theo hệ số đàn hồi. Khối lượng suy ra từ bình phương bán kính (quân cái nặng hơn quân thường để cú bắn thật sự đẩy được các quân khác đi), một xấp xỉ vật lý hợp lý mà không cần một trường `mass` riêng phải đồng bộ tay.

Xếp quân cũng có một chi tiết nhỏ mình khá ưng ý:

```javascript
for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    combined.push({ x: center.x + Math.cos(angle) * ring1Radius, ... });
}
for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 6) * i - Math.PI / 2 + Math.PI / 12;
    combined.push({ x: center.x + Math.cos(angle) * ring2Radius, ... });
}
```

6 quân vòng trong cách nhau 60°, 12 quân vòng ngoài cách nhau 30° và lệch pha 15° so với vòng trong — để không quân nào thẳng hàng bán kính với quân vòng trong, đúng cách xếp carrom thật — rồi tô màu xen kẽ trắng/đen theo chỉ số chẵn/lẻ trong mảng đã nối, đảm bảo đúng 9 trắng - 9 đen mà không cần đếm tay.

AI của máy dùng kỹ thuật "điểm ma" (ghost ball) kinh điển của game bi-a/carrom: tính điểm mà quân cái phải chạm vào để đẩy quân mục tiêu đúng hướng tới lỗ, rồi nhắm quân cái vào điểm đó — đơn giản hơn nhiều so với giải ngược phương trình va chạm. Nhưng AI không chơi hoàn hảo — mỗi lần tính xong hướng bắn, nó xoay vector đó đi một góc ngẫu nhiên nhỏ bằng ma trận xoay 2D thủ công, để máy có xác suất bắn hụt hợp lý. Nếu không, một AI dùng đúng công thức điểm ma không sai số sẽ gần như bất bại. Điều mình chưa xử lý là AI luôn nhắm vào quân gần lỗ bất kỳ nhất mà không kiểm tra đường bắn có bị quân khác chắn hay không — hiếm khi lộ rõ vì bàn khá thoáng sau vài lượt đầu, nhưng về lý thuyết máy hoàn toàn có thể "bắn xuyên" qua một quân chắn đường mà không nhận ra.

Khi đọc lại `handlePocketsAndWalls` để viết bài này, mình nghi ngờ có một bug tiềm ẩn: lỗ nằm đúng tại 4 góc bàn, tức chính giữa giao điểm của hai cạnh tường — một quân bay gần góc nhưng không đủ gần tâm lỗ để bị "nuốt" sẽ rơi vào vùng vừa gần lỗ vừa chạm cả hai cạnh tường cùng lúc, liệu hai điều kiện đó có giằng co nhau không? Hoá ra không — hàm return ngay sau khi tìm thấy quân rơi lỗ, và toàn bộ khối kiểm tra tường nằm sau vòng lặp đó trong cùng một hàm, nên nếu quân đã rơi lỗ, code không bao giờ chạy tới phần phản xạ tường trong cùng một lệnh gọi. Trường hợp duy nhất gây cảm giác "kỳ lạ" là một quân sượt qua rất sát miệng lỗ mà không đủ điều kiện rơi — nó bị bật lại bởi tường như bình thường, đúng ý đồ thiết kế, không phải lỗi. Vẫn là một lần đáng để đi tới cùng xác nhận, vì thứ tự return-sớm trong một hàm xử lý nhiều điều kiện loại trừ lẫn nhau là kiểu logic rất dễ bị vô tình phá vỡ nếu sau này ai đó thêm một nhánh mới vào giữa mà quên giữ nguyên tắc đó.

Luật carrom trong game cũng bị đơn giản hoá có chủ đích — không còn "phủ hậu" (due), hậu đỏ vào lỗ chỉ đơn giản cộng điểm ngay, không cần đánh tiếp một quân thường ngay sau đó để khoá điểm hậu như luật thật. Lựa chọn này giữ luật dễ hiểu trong vài giây đọc mô tả, đổi lại hậu đỏ không mang đúng ý nghĩa chiến thuật "rủi ro cao, thưởng cao" như carrom thật.

Câu chuyện lớn nhất của Pocket Carrom không nằm ở vật lý va chạm, dù đó là phần code phức tạp nhất, mà nằm ở việc thiết kế input phải được viết lại sau khi đã "xong" — không phải vì nó có bug, mà vì nó chưa đủ tốt cho đúng đối tượng người dùng thật sự sẽ chạm vào nó bằng ngón tay chứ không phải con trỏ chuột. Một cơ chế điều khiển "chạy đúng" và một cơ chế điều khiển "cảm giác đúng" hoá ra là hai tiêu chuẩn khác nhau, và chỉ tiêu chuẩn thứ hai mới thật sự quyết định game có chơi được thoải mái trên điện thoại hay không.
