# Bomberman: mạng cuối cùng có thể bị trừ nhiều hơn một lần trong cùng một khung hình

Cờ bất tử tạm thời `player.invulnerable` trong game này làm đúng hai việc: ngăn một vụ nổ đánh trúng người chơi nhiều lần liên tiếp, và — một cách tình cờ nhưng khá hiệu quả — ngăn hai vụ nổ khác nhau trong cùng một chuỗi phản ứng dây chuyền cùng đánh trúng người chơi trong cùng một khung hình, vì vụ nổ đầu tiên trúng đích sẽ bật cờ này lên ngay lập tức, khiến vụ nổ thứ hai (xử lý ngay sau đó trong cùng vòng lặp) tự động bị chặn. Cơ chế tự bảo vệ này hoạt động tốt — trừ đúng một trường hợp: khi cú nổ đó chính là cú khiến người chơi hết sạch mạng. Trên con đường dẫn tới Game Over, cờ bất tử không bao giờ được bật lên, và lớp bảo vệ ngầm định đó biến mất đúng vào lúc nó cần thiết nhất.

Bomberman là bản clone phức tạp thứ hai mình làm trong repo, sau Tank 1990, và phức tạp hơn hẳn về mặt logic lan truyền: một quả bom nổ có thể kích nổ dây chuyền các quả bom khác nằm trong tầm lửa của nó, mỗi vụ nổ dây chuyền lại tạo ra một vùng lửa mới, và tất cả các vùng lửa đó — dù bắt nguồn từ bao nhiêu quả bom khác nhau — đều có thể được xử lý trong đúng một khung hình duy nhất nếu ngòi nổ của chúng đủ gần nhau. Phần logic dây chuyền, trái tim của cả game, nằm gọn trong một hàm đệ quy:

```javascript
function explodeBomb(bomb, now) {
    if (bomb.exploded) return;
    bomb.exploded = true;
    bombs = bombs.filter((b) => b !== bomb);

    const cells = [{ col: bomb.col, row: bomb.row }];
    [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT].forEach((dir) => {
        for (let i = 1; i <= bomb.flameRange; i++) {
            ...
            if (map.destroySoft(col, row)) { maybeDropPowerup(col, row); break; }
        }
    });

    explosions.push({ cells, expiresAt: now + EXPLOSION_DURATION_MS, hit: new Set() });

    bombs.slice().forEach((other) => {
        if (cells.some((c) => c.col === other.col && c.row === other.row)) {
            explodeBomb(other, now);   // đệ quy — có thể tạo nhiều explosion object trong cùng 1 khung hình
        }
    });
}
```

Cờ `bomb.exploded` ngăn một quả bom bị nổ hai lần, bảo vệ khỏi đệ quy vô hạn nếu hai bom cùng nằm trong vùng nổ của nhau. Nhưng mỗi lần `explodeBomb` chạy — dù gọi trực tiếp hay gọi đệ quy — đều tạo ra một `explosion` object riêng biệt, với một `Set` "đã đánh trúng" riêng biệt, rồi đẩy vào chung một mảng `explosions`. Đây chính là điểm mấu chốt: cái `hit` đó chỉ ngăn được việc *cùng một* vụ nổ đánh trúng một mục tiêu hai lần, không ngăn được *các vụ nổ khác nhau* trong cùng chuỗi phản ứng dây chuyền cùng đánh trúng một mục tiêu trong cùng một khung hình.

Trong tình huống bình thường (còn mạng), phần xử lý va chạm trông ổn:

```javascript
function hitPlayer() {
    player.lives -= 1;
    if (player.lives <= 0) {
        triggerGameOver("Bạn đã hết mạng!");   // KHÔNG đặt invulnerable
    } else {
        respawnPlayer();                        // đặt invulnerable = true NGAY LẬP TỨC
    }
}
```

`respawnPlayer()` đặt `player.invulnerable = true` đồng bộ, ngay trong lượt gọi `hitPlayer()`. Nhờ vậy, nếu `updateExplosions` đang duyệt qua nhiều `explosion` object trong cùng một khung hình (từ một chuỗi phản ứng dây chuyền), vụ nổ đầu tiên đánh trúng người chơi sẽ bật `invulnerable` ngay, khiến điều kiện `!player.invulnerable` ở các vụ nổ tiếp theo trong cùng vòng lặp tự động sai — một cơ chế tự bảo vệ hoạt động đúng, dù không ai chủ đích thiết kế nó cho riêng tình huống nhiều vụ nổ cùng lúc. Nhưng khi `player.lives` vừa giảm xuống 0 ngay tại lần trúng đầu tiên, nhánh `triggerGameOver` chạy thay vì `respawnPlayer`, và `player.invulnerable` không hề được đặt lại. `triggerGameOver` có cờ tự vệ (`if (state === "gameover") return;`) ngăn hiện overlay hai lần, nhưng `hitPlayer()` thì không có cờ tự vệ tương tự — nếu vụ nổ thứ hai trong cùng chuỗi dây chuyền cũng phủ đúng ô lưới người chơi đang đứng, `hitPlayer()` bị gọi thêm một lần nữa, trừ tiếp `player.lives` xuống một giá trị âm sâu hơn.

Về giao diện, người chơi vẫn chỉ thấy đúng một màn hình Game Over nhờ cờ tự vệ trong `triggerGameOver`, điểm số hiển thị không sai — nhưng `player.lives` trong bộ nhớ có thể kết thúc ở một giá trị âm sâu hơn mức cần thiết. Đây không phải một nhánh lý thuyết chưa từng có đường thực thi dẫn tới — chỉ cần hai quả bom kích hoạt dây chuyền mà vùng nổ của cả hai đều phủ đúng ô người chơi đang đứng, đúng lúc mạng cuối cùng bị mất, là đủ để race condition này xảy ra thật. Nó chỉ đơn giản là bị che khuất bởi các lớp bảo vệ khác khiến hậu quả không lộ ra rõ ràng trên giao diện.

Điều thú vị nhất khi lần theo bug này là nhận ra sự bất đối xứng giữa hai hàm: `triggerGameOver()` có cờ chặn gọi lại nhiều lần, còn `hitPlayer()` — hàm gọi tới nó — thì không. Nếu `hitPlayer()` tự kiểm tra `state === "gameover"` ngay từ đầu và thoát sớm, toàn bộ chuỗi hệ quả, bao gồm cả việc không đặt `invulnerable`, sẽ không còn quan trọng nữa, vì hàm sẽ không bao giờ chạy tới đó lần thứ hai. Một cờ tự vệ chống gọi lại chỉ bảo vệ được đúng phần thân hàm nó nằm trong, không bảo vệ được các lệnh gọi khác dẫn tới cùng một hàm đó từ nhiều nguồn — muốn chặn toàn bộ chuỗi hệ quả, cờ tự vệ cần đặt ở hàm đầu tiên trong chuỗi bị gọi lại nhiều lần, không phải hàm cuối cùng.

Bomberman có logic lan truyền dây chuyền được viết đúng và mạnh mẽ — phần khó nhất về mặt thuật toán trong cả game hoạt động chính xác ngay từ đầu. Bug tìm được không nằm ở đó, mà nằm ở một góc khuất tinh vi hơn nhiều: một cờ trạng thái vô tình đảm nhiệm một vai trò bảo vệ nó chưa từng được thiết kế cho, hoạt động tốt trong phần lớn trường hợp nhờ tác dụng phụ, nhưng có đúng một nhánh — mất mạng cuối cùng — nơi tác dụng phụ đó không xảy ra. Những cơ chế bảo vệ "tự nhiên xuất hiện" từ cách các hàm gọi lẫn nhau thường mong manh hơn những cơ chế được thiết kế tường minh — chúng hoạt động cho tới đúng lúc một nhánh nào đó phá vỡ giả định ngầm mà không ai từng viết ra thành lời.
