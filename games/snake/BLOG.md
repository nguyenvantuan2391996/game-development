# Dạy một con rắn tự học chơi Snake bằng Q-learning, ngay trong trình duyệt

Có một buổi tối mình để chế độ AI của Snake chạy ở tốc độ Turbo qua đêm, tò mò xem sau vài nghìn "kiếp" (episode) con rắn học được tới đâu. Sáng hôm sau mở lại tab, số liệu khá đẹp: epsilon đã tụt gần sàn, điểm trung bình mỗi ván cao hơn hẳn đêm qua. Ngồi quan sát thêm vài phút thì nhận ra một điều kỳ lạ: mỗi khi con rắn rơi vào một tình huống nó "chưa từng thấy bao giờ", nó luôn luôn rẽ trái. Không phải "thường rẽ trái" — mà là luôn luôn, 100% các lần, như một phản xạ có điều kiện tuyệt đối.

Ban đầu mình tưởng đây là một chiến thuật sống sót hợp lý mà agent tự khám phá ra. Nhưng khi xoá sạch bảng Q-value và luyện lại từ đầu (epsilon = 1.0, bảng hoàn toàn rỗng), hành vi đó xuất hiện lại y hệt, ngay từ những episode đầu tiên khi bảng gần như trống trơn. Đây không phải thứ agent học được — đây là một thiên lệch nằm sẵn trong chính cách mình viết hàm chọn hành động, từ trước khi agent kịp học bất cứ điều gì.

Phần lớn "AI" ở các game khác trong repo là AI cổ điển theo nghĩa cứng — minimax/negamax có sẵn tri thức luật chơi (Chess, Xiangqi), hoặc một bảng heuristic tính điểm sẵn (Caro). Snake là game đầu tiên mình để máy tự tìm ra cách chơi tốt, không cấy sẵn chiến thuật, chỉ có một tín hiệu thưởng/phạt đơn giản. Q-learning dạng bảng (tabular) là lựa chọn tự nhiên: không mạng nơ-ron, không framework, chỉ một object JavaScript ánh xạ từ "trạng thái" sang "giá trị kỳ vọng của từng hành động".

Quyết định quan trọng nhất, và cũng là thứ quyết định cả dự án có khả thi trong một buổi tối hay không, là cách mã hoá trạng thái. Trạng thái thô của Snake — toàn bộ lưới 15×15 cộng vị trí từng khúc thân — sẽ khiến bảng Q-value không bao giờ hội tụ nổi. Giải pháp là mã hoá tương đối, chỉ 11 bit, độc lập hoàn toàn với kích thước bàn cờ:

```javascript
function getState(engine) {
    const head = engine.snake[0];
    const dir = engine.direction;
    const left = { x: dir.y, y: -dir.x };
    const right = { x: -dir.y, y: dir.x };

    const dangerStraight = engine.isDanger({ x: head.x + dir.x, y: head.y + dir.y });
    const dangerRight = engine.isDanger({ x: head.x + right.x, y: head.y + right.y });
    const dangerLeft = engine.isDanger({ x: head.x + left.x, y: head.y + left.y });

    const foodUp = engine.food.y < head.y;
    const foodDown = engine.food.y > head.y;
    const foodLeft = engine.food.x < head.x;
    const foodRight = engine.food.x > head.x;

    const movingUp = dir.y === -1;
    const movingDown = dir.y === 1;
    const movingLeft = dir.x === -1;
    const movingRight = dir.x === 1;

    const bits = [
        dangerStraight, dangerRight, dangerLeft,
        foodUp, foodDown, foodLeft, foodRight,
        movingUp, movingDown, movingLeft, movingRight,
    ];

    return bits.map((b) => (b ? "1" : "0")).join("");
}
```

11 bit ghép thành một chuỗi như `"10001001000"`, dùng thẳng làm key tra cứu vào `qTable`. Không gian trạng thái tối đa là 2^11 = 2048 tổ hợp — nhỏ tới mức toàn bộ bảng có thể hội tụ chỉ sau vài trăm tới vài nghìn episode, chạy gọn trong `localStorage`. Chi tiết quan trọng thứ hai: hành động là tương đối (rẽ trái/đi thẳng/rẽ phải), không phải tuyệt đối, và "hiểm nguy"/"hướng mồi" cũng tính tương đối theo hướng đầu rắn đang nhìn. Nhờ vậy một trạng thái học được khi rắn đang đi lên tự động áp dụng được khi rắn đi sang phải, hoàn toàn miễn phí, không cần thêm dòng code xử lý đối xứng nào.

Công thức cập nhật Q-value gọn trong một dòng:

```javascript
learn(state, actionIndex, reward, nextState, done) {
    const q = this.getQ(state);
    const nextQ = this.getQ(nextState);
    const maxNextQ = done ? 0 : Math.max(...nextQ);
    q[actionIndex] += this.alpha * (reward + this.gamma * maxNextQ - q[actionIndex]);
}
```

Reward cũng đơn giản tới mức tối thiểu, sau khi mình thử một bản đầu phức tạp hơn nhiều (phạt khi lại gần rìa bàn cờ, thưởng theo không gian trống quanh đầu rắn ước lượng bằng flood-fill, phạt khi gần thân...) và nhận ra kết quả là một hành vi kỳ lạ không tách bạch được đến từ tín hiệu nào trong 6-7 tín hiệu chồng lên nhau. Rút gọn về đúng 4 nhánh hoá ra lại dễ debug hơn hẳn — mỗi lần rắn làm gì bất thường, chỉ có tối đa 4 khả năng để truy vết:

```javascript
let reward;
if (result.died) {
    reward = -10;
} else if (result.ate) {
    reward = 10;
} else {
    const newDist = manhattanDistance(engine.snake[0], engine.food);
    reward = newDist < prevDist ? 1 : -1;
}
```

Quay lại chuyện "luôn rẽ trái ở trạng thái lạ". Thủ phạm nằm ở `chooseAction` — hàm chọn hành động tốt nhất khi không rơi vào nhánh khám phá ngẫu nhiên của epsilon-greedy:

```javascript
chooseAction(state) {
    if (Math.random() < this.epsilon) {
        return Math.floor(Math.random() * this.actions.length);
    }
    const q = this.getQ(state);
    let bestIndex = 0;
    for (let i = 1; i < q.length; i++) {
        if (q[i] > q[bestIndex]) bestIndex = i;
    }
    return bestIndex;
}
```

`bestIndex` khởi tạo bằng 0, điều kiện so sánh dùng `>` chứ không phải `>=`. Với trạng thái mới, `getQ` trả về `[0, 0, 0]` — tất cả bằng nhau — nên chỉ số thấp nhất luôn thắng. Vì `this.actions = [-1, 0, 1]` (rẽ trái, đi thẳng, rẽ phải) và index 0 ứng với rẽ trái, kết quả là một thiên lệch có hệ thống, mạnh nhất ở đầu quá trình huấn luyện và vẫn còn với bất kỳ trạng thái hiếm nào chưa từng được cập nhật khác 0. Đúng chiến lược mình đã dùng cho AI của Chess và Xiangqi — gom các chỉ số đồng hạng vào một mảng rồi chọn ngẫu nhiên trong số đó — lẽ ra phải được áp dụng nhất quán ở đây từ đầu, nhưng mình đã quên. Cùng một lớp lỗi, xuất hiện lại ở một thuật toán hoàn toàn khác, chỉ vì thiếu một checklist nhắc lại bài học cũ.

Một đêm khác, mình để Turbo chạy qua đêm rồi phát hiện số episode chỉ nhích lên một chút so với lúc chuyển tab đi làm việc khác — thấp hơn nhiều so với kỳ vọng nếu tính theo tốc độ tick. Grep cả thư mục `js/` tìm `visibilitychange`, `requestAnimationFrame`, `performance.now` — không có gì cả, vòng lặp AI hoàn toàn dựa vào `setInterval`. Đây chính là cơ chế throttle `setInterval` quen thuộc của trình duyệt khi tab không active, nhưng hậu quả ở đây nặng hơn hẳn so với một rhythm game bị giật hình khi quay lại tab: với một vòng lặp huấn luyện, thời gian chính là tài nguyên đang được tiêu thụ để tạo ra giá trị — mỗi tick là một mẫu học — throttle nó tức là âm thầm đánh cắp tài nguyên đó mà không ai hay biết trong lúc nó đang xảy ra.

Bug thú vị cuối cùng lại nằm ở một dòng trông như thừa. Đọc lại handler của nút "xoá & học lại từ đầu":

```javascript
document.getElementById("btn-reset-ai").addEventListener("click", () => {
    clearInterval(timer);
    agent.resetLearning();
    startAi();
});
```

`startAi()` gán hẳn một agent hoàn toàn mới (`agent = new QLearningAgent()`), vậy gọi `agent.resetLearning()` lên đối tượng cũ trước đó phỏng có ích gì, khi nó sắp bị vứt bỏ ngay dòng kế tiếp? Đây chính xác là dạng "trông thừa nhưng không thừa" — cái bẫy đang chờ sẵn cho một lần refactor sau lỡ tay dọn dẹp. Thực tế `resetLearning()` không chỉ reset state trong bộ nhớ (phần này đúng là vô ích) mà còn xoá cả ba key khỏi `localStorage`, còn constructor của `QLearningAgent` thì tự động gọi `this.load()` để đọc lại đúng ba key đó nếu chúng còn tồn tại. Nếu bỏ dòng `resetLearning()` đi, `new QLearningAgent()` sẽ tự load lại đúng Q-table cũ từ đĩa — nút "học lại từ đầu" sẽ trông như đã reset trong đúng một khung hình, rồi ngay lập tức Q-table cũ ùa về lại, một bug im lặng không throw lỗi gì cả.

Điều làm mình bất ngờ nhất sau dự án này không phải việc Q-learning "hoạt động" — với không gian trạng thái nhỏ và reward hợp lý, nó gần như chắc chắn hội tụ, đó là bản chất toán học của thuật toán. Cái bất ngờ là những chi tiết tưởng thuộc về "code sạch" thông thường — cách phá thế hoà trong một vòng lặp `for`, một dòng gọi hàm trông có vẻ dư — lại chính là những nơi quyết định liệu quá trình học có công bằng hay thiên lệch, liệu một tính năng như "học lại từ đầu" có thật sự làm đúng những gì tên gọi của nó hứa hẹn hay không.
