# Plants vs Zombies: quả nắng có một trình xử lý sự kiện tham chiếu tới chính nó trước khi nó tồn tại

```javascript
el.addEventListener("click", () => collectSun(sunObj.id));
boardEl.appendChild(el);

const sunObj = { ... };
```

Đọc theo đúng thứ tự từ trên xuống, dòng đầu tiên gán một trình xử lý sự kiện tham chiếu tới biến `sunObj` — trước khi `const sunObj` được khai báo ở dòng thứ ba. Theo trực giác về cách JavaScript đọc code tuần tự, đây trông như một lỗi chắc chắn sẽ ném `ReferenceError: Cannot access 'sunObj' before initialization` ngay khi chạy. Nhưng game này đã tồn tại, đã chạy, và quả nắng vẫn nhặt được bình thường. Đây là câu chuyện về đúng một dòng code trông như sai nhưng chạy đúng, nhờ một đặc tính của closure trong JavaScript ít ai để ý tới.

Plants vs Zombies khác hẳn phần lớn game còn lại trong repo của mình ở một điểm cấu trúc quan trọng: nó không dùng `<canvas>`. Toàn bộ cây trồng, zombie, đạn, quả nắng đều là các phần tử DOM thực sự (`<div>`), di chuyển bằng cách đổi `style.left`/`style.top` — giống cách Audition (dance game) làm hơn là cách vẽ pixel của phần lớn game canvas khác trong repo. Với một bàn cờ 5 làn, nhiều cây trồng, nhiều zombie, nhiều viên đạn cùng lúc, mỗi thực thể là một phần tử DOM riêng với một trình xử lý sự kiện riêng — độ phức tạp về quản lý vòng đời đối tượng (tạo, cập nhật, xoá đúng lúc) cao hơn hẳn so với vẽ lại toàn bộ khung hình trên một canvas duy nhất mỗi lần.

Điểm thiết kế mình thích nhất trong game là cách quả nắng rơi được tách thành hai giai đoạn độc lập — hoạt ảnh CSS (rơi xuống bằng `transition`) và trạng thái logic (`falling` → `idle` → `gone`) chạy song song nhưng không đồng bộ cứng với nhau:

```javascript
requestAnimationFrame(() => {
    el.style.transition = "top 2.4s linear";
    el.style.top = restTop + "px";
});

setTimeout(() => {
    if (sunObj.state === "falling") {
        sunObj.state = "idle";
        sunObj.idleSince = performance.now();
    }
}, 2450);
```

Hoạt ảnh rơi (2.4 giây, do CSS đảm nhiệm) và mốc chuyển trạng thái sang "idle" (2.45 giây, do `setTimeout` đảm nhiệm) là hai con số riêng biệt, chỉ gần bằng nhau chứ không dùng chung một biến — đủ lệch (50ms) để đảm bảo hoạt ảnh CSS chắc chắn đã hoàn tất trước khi logic game coi quả nắng là "đã dừng rơi, có thể bắt đầu đếm giờ để biến mất". Đây là chỗ mình chấp nhận một khoản nợ nhỏ: hai hằng số mô tả cùng một khái niệm thời gian nhưng viết ở hai cú pháp khác nhau (chuỗi CSS `"2.4s"` và số `2450`) rất dễ trôi lệch nhau qua các lần chỉnh sửa sau này, nếu ai đó đổi thời gian rơi mà quên đồng bộ con số kia.

Nhưng phát hiện thú vị nhất khi mình đọc lại `spawnFallingSun` để viết bài này lại nằm ở chính hàm sinh ra quả nắng đó:

```javascript
function spawnFallingSun() {
    ...
    const el = document.createElement("div");
    ...
    el.addEventListener("click", () => collectSun(sunObj.id));   // (1) tham chiếu sunObj
    boardEl.appendChild(el);

    const sunObj = {                                              // (2) khai báo sunObj
        id: nextId(),
        el,
        state: "falling",
        idleSince: 0,
    };
    suns.push(sunObj);
    ...
}
```

Dòng `(1)` đọc `sunObj` bên trong một arrow function — nhưng tại thời điểm dòng `(1)` được thực thi (tức lúc `addEventListener` được gọi để đăng ký trình xử lý), bản thân arrow function đó chưa hề chạy, nó chỉ được lưu lại như một callback chờ sự kiện `click` thật sự xảy ra. `const sunObj` ở dòng `(2)` chạy ngay sau đó, trong cùng lượt thực thi đồng bộ của `spawnFallingSun`, hoàn tất trước khi hàm kết thúc. Vì một sự kiện click chỉ có thể xảy ra sau khi người dùng thực sự nhấp chuột — muộn hơn rất nhiều so với thời điểm `spawnFallingSun` đã chạy xong toàn bộ — nên tới lúc arrow function ở dòng `(1)` thực sự được gọi, `sunObj` trong closure của nó đã được khởi tạo đầy đủ từ lâu.

JavaScript engine không "biên dịch" toàn bộ hàm rồi kiểm tra thứ tự biến trước khi chạy — nó thực thi tuần tự, và một closure chỉ thực sự đọc giá trị của biến nó tham chiếu tại đúng thời điểm nó được gọi, không phải tại thời điểm nó được định nghĩa. Miễn là không có gì gọi arrow function đó trước khi dòng `(2)` chạy xong, code chạy đúng như mong đợi mọi lần — và với một sự kiện click cần tương tác người dùng thật, điều đó gần như không bao giờ xảy ra.

Nhưng đây là kiểu code "đúng nhờ may mắn về thời gian" hơn là "đúng nhờ cấu trúc rõ ràng". Nếu sau này ai đó tái cấu trúc `spawnFallingSun` — ví dụ gọi trực tiếp hàm xử lý click ngay trong quá trình khởi tạo để giả lập "tự động nhặt nắng" cho một chế độ chơi thử — mà không để ý tới thứ tự khai báo hiện tại, họ sẽ gặp ngay `ReferenceError: Cannot access 'sunObj' before initialization`, một lỗi hoàn toàn không liên quan tới logic họ vừa thêm vào, mà tới một quyết định thứ tự dòng lệnh từ rất lâu trước đó.

Bài học rút ra ở đây không mới nhưng luôn đáng nhắc lại: JavaScript cho phép một closure "hứa hẹn" đọc một biến chưa tồn tại tại thời điểm nó được định nghĩa, miễn là biến đó tồn tại trước khi closure thực sự được gọi — một sự linh hoạt mạnh mẽ nhưng cũng dễ gây hiểu lầm khi đọc code theo đúng thứ tự dòng từ trên xuống. Thứ tự "khai báo dữ liệu trước, gắn trình xử lý sự kiện tham chiếu tới dữ liệu đó sau" luôn là thói quen an toàn hơn — không thay đổi hành vi runtime trong trường hợp này, nhưng loại bỏ hoàn toàn khả năng một thay đổi không liên quan trong tương lai vô tình biến một đoạn code "chạy đúng nhờ may mắn thời gian" thành một lỗi thật.

Một chi tiết nhỏ khác đáng nhắc: khi một zombie/cây/quả nắng bị xoá bằng `el.remove()`, các trình xử lý sự kiện đã gắn vào nó (như listener click trên quả nắng) không được gỡ bỏ tường minh bằng `removeEventListener`. Không sao cả — một khi phần tử không còn nằm trong DOM tree và không còn tham chiếu JavaScript nào trỏ tới nó, engine trình duyệt tự giải phóng nó (kèm listener) qua garbage collection. Vẫn là một chỗ có thể làm rõ ý đồ dọn dẹp hơn nếu làm lại, nhưng không phải một vấn đề thực sự.

Plants vs Zombies là game "phi-canvas" phức tạp nhất trong repo, và đúng như kỳ vọng với một codebase quản lý nhiều phần tử DOM động cùng lúc, phần lớn rủi ro tiềm ẩn thường nằm ở vòng đời đối tượng. Điều bất ngờ nhất mình tìm được khi đọc lại code không phải một lỗi theo nghĩa thông thường, mà là một dòng code hoàn toàn đúng nhưng viết theo thứ tự "sai" so với trực giác đọc tuần tự — một lời nhắc rằng hiểu đúng closure trong JavaScript không chỉ là kiến thức lý thuyết, mà trực tiếp quyết định được liệu một đoạn code trông đáng ngờ khi đọc lướt có thực sự là bug hay không.
