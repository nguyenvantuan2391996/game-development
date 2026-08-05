# Pooyan: viên đá không bao giờ có thể chạm tới bạn, dù màn hình nói ngược lại

Màn hình bắt đầu của game này ghi rõ: "Bắn nổ bóng bay và đá rơi, đừng để chúng chạm tới bạn!" — hai mối nguy, một lời cảnh báo duy nhất. Nhưng lần theo đúng con số toạ độ nơi đá được sinh ra, và đúng công thức chuyển động của nó mỗi khung hình, có một sự thật không ai để ý: viên đá không bao giờ, dưới bất kỳ hoàn cảnh nào, có thể chạm tới người chơi. Không phải vì đá bay quá chậm hay né quá dễ, mà vì khoảng cách ngang giữa nơi đá được phép sinh ra và nơi người chơi đứng luôn lớn hơn khoảng cách hai vật cần chạm nhau để va chạm được tính là xảy ra — và đá không bao giờ di chuyển ngang trong suốt vòng đời của nó.

Pooyan là bản clone của game arcade cùng tên trong repo của mình — một cung thủ đứng cố định bên trái màn hình, bắn tên sang phải để tiêu diệt hai loại mục tiêu: bóng bay trôi vào từ bên phải theo đường sin, và đá rơi thẳng từ trên xuống. Đây cũng chính là game mình dùng làm khuôn mẫu gốc cho rất nhiều game canvas viết sau nó (Space Impact, Bắn Ruồi, Hứng Bia đều mượn lại cấu trúc state machine, `rectsOverlap`, `difficultyStep` từ đây) — khiến việc phát hiện ra một lỗ hổng va chạm ngay trong chính bản gốc này đặc biệt đáng chú ý, vì cấu trúc đó đã được tin tưởng và tái sử dụng nhiều lần mà không ai đặt lại câu hỏi cho từng con số cụ thể.

Sự khác biệt cốt lõi giữa hai loại mối đe doạ nằm ở đúng một chi tiết chuyển động:

```javascript
// Bóng bay: x GIẢM DẦN theo thời gian — thực sự tiến về phía cung thủ
balloons.forEach((b) => {
    b.elapsed += dt;
    b.x -= b.speed * dt;
});

// Đá: chỉ y TĂNG DẦN — x giữ nguyên suốt vòng đời, không bao giờ tiến gần cung thủ hơn
rocks.forEach((r) => {
    r.y += r.speed * dt;
});
```

Bóng bay có một trục chuyển động (`x`) hướng thẳng về phía cung thủ đứng cố định ở bên trái — nó thực sự "tới gần" theo đúng nghĩa đen mỗi khung hình. Đá thì không: toạ độ `x` của nó được chốt cứng ngay tại thời điểm sinh ra và không bao giờ thay đổi, chỉ có `y` thay đổi khi nó rơi xuống. Với một cung thủ chỉ di chuyển theo trục dọc tại một vị trí `x` cố định, hai vật thể chỉ có thể va chạm nếu vùng toạ độ `x` của chúng từng chồng lấn nhau tại một thời điểm nào đó — và với đá, điều đó phải đúng ngay từ lúc sinh ra, vì nó không bao giờ thay đổi sau đó.

Đá được sinh ra như sau:

```javascript
function spawnRock() {
    const bonus = difficultyStep() * DIFFICULTY_SPEED_BONUS;
    rocks.push({
        x: randomBetween(PLAYER_X + 60, GAME_WIDTH - ROCK_SIZE),
        y: -ROCK_SIZE,
        speed: randomBetween(ROCK_SPEED_MIN, ROCK_SPEED_MAX) + bonus,
        alive: true,
    });
}
```

Khoảng sinh `PLAYER_X + 60` nhiều khả năng được mình chọn với ý định hợp lý lúc đó: tránh đá sinh ra chồng ngay lên vị trí cung thủ — một sự cố "chết ngay khi vừa xuất hiện" hoàn toàn có thể xảy ra nếu không có khoảng đệm này. Nhưng khoảng đệm 60px đó, cộng với việc đá không bao giờ di chuyển ngang sau khi sinh ra, vô tình đẩy luôn khả năng va chạm ra khỏi tầm với vĩnh viễn — không chỉ tránh được sự cố "chết ngay khi xuất hiện", mà tránh được luôn mọi khả năng va chạm trong suốt vòng đời của viên đá.

Tính cụ thể bằng số thì thấy ngay: cung thủ có `PLAYER_X = 46`, `PLAYER_SIZE = 30`, nên vùng va chạm của nó trải từ `x = 31` tới `x = 61`. Đá sinh ra tại `x = randomBetween(106, 334)` với `ROCK_SIZE = 26`, nên ngay cả viên đá sinh ra gần cung thủ nhất có thể (`x = 106`) cũng có vùng va chạm trải từ `93` tới `119`. Cạnh phải xa nhất của cung thủ là `61`; cạnh trái gần nhất mà bất kỳ viên đá nào từng có thể đạt được là `93`. Khoảng cách tối thiểu giữa chúng — 32 pixel — không bao giờ thu hẹp, vì toạ độ `x` của một viên đá không hề thay đổi từ lúc sinh ra cho tới lúc nó rơi khỏi đáy màn hình và bị xoá khỏi mảng. `rectsOverlap` giữa cung thủ và bất kỳ viên đá nào, ở bất kỳ thời điểm nào, sẽ luôn trả về `false`.

Hệ quả là đá rơi trong game này là một mối đe doạ hoàn toàn trang trí — nó rơi, nó có thể bị bắn hạ để ghi 60 điểm, nhưng nó không bao giờ có thể khiến người chơi mất mạng, bất kể cung thủ đứng yên hay di chuyển liên tục, bất kể độ khó đã tăng cao tới đâu. Toàn bộ rủi ro thực sự trong ván chơi chỉ tới từ bóng bay — thứ duy nhất thực sự di chuyển về phía cung thủ. Điều thú vị là không ai nhận ra khi chơi thử, vì đá rơi vẫn trông nguy hiểm — nó rơi nhanh, nó xuất hiện đột ngột, và bản năng tự nhiên của người chơi là tránh đường bay của nó dù không cần thiết. Cảm giác "mình vừa né được một viên đá" hoàn toàn có thể xảy ra dù về mặt toán học, viên đá đó chưa bao giờ có khả năng chạm tới cung thủ ngay từ đầu — một dạng ảo giác về rủi ro, không phải rủi ro thật.

Bài học rút ra ở đây khá thú vị: va chạm giữa hai vật thể không chỉ phụ thuộc vào việc hàm kiểm tra va chạm có đúng hay không — nó phụ thuộc vào việc dữ liệu toạ độ đưa vào hàm đó có bao giờ thực sự đạt tới điều kiện chồng lấn hay không. `rectsOverlap` ở đây hoàn toàn chính xác, vấn đề không nằm trong logic kiểm tra mà nằm trong hình học của toàn bộ hệ thống sinh ra dữ liệu cho nó. Một khoảng đệm an toàn (tránh spawn chồng lên người chơi) và một khoảng cách loại bỏ hoàn toàn khả năng va chạm là hai điều rất khác nhau về độ lớn, nhưng dễ bị nhầm là cùng một loại quyết định an toàn nếu chỉ ước lượng bằng mắt trên một bản vẽ màn hình thay vì tính cụ thể bằng số.

Pooyan là bản gốc cho cả một dòng game canvas trong repo của mình, và phần lớn khuôn mẫu nó để lại — state machine, va chạm AABB, độ khó tăng dần — đều vững chắc và được tái sử dụng an toàn nhiều lần sau đó. Nhưng chính trong bản gốc này lại tồn tại một trong những phát hiện rõ ràng nhất khi mình ngồi đọc lại toàn bộ các game — không phải một race condition tinh vi hay một closure khó hiểu, mà là một phép tính khoảng cách đơn giản chưa từng được ai thực sự làm: nếu đã tính, hai con số 61 và 93 sẽ tự nói lên tất cả. Đôi khi bug lớn nhất không cần một quá trình debug phức tạp để tìm ra — nó chỉ cần một người ngồi xuống, viết ra hai con số cạnh nhau, và tự hỏi liệu chúng có bao giờ thực sự gặp nhau hay không.
