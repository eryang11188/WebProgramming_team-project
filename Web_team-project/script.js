document.addEventListener("DOMContentLoaded", () => {
    const itemList = document.getElementById("itemList");
    const form = document.getElementById("addItemForm");
    const titleInput = document.getElementById("newItemTitle");
    const deadlineInput = document.getElementById("newItemDeadline");
    const toggleViewBtn = document.getElementById("toggleView");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const sortButtons = document.querySelectorAll("#sortButtons button");
    const submitBtn = form.querySelector("button[type='submit']");
    const searchInput = document.getElementById("searchInput");

    let currentView = 'table';
    let currentFilter = 'all';
    let currentSort = 'asc';
    let editingItemId = null;

    searchInput.addEventListener("input", () => loadAndRender());

    const titleWarning = document.createElement('small');
    titleWarning.style.color = 'red';
    titleInput.insertAdjacentElement('afterend', titleWarning);

    titleInput.addEventListener('input', () => {
        const val = titleInput.value.trim();
        if (val.length < 2) {
            titleWarning.textContent = '물품명은 최소 2글자 이상이어야 합니다.';
            submitBtn.disabled = true;
        } else if (val.length > 20) {
            titleWarning.textContent = '물품명은 20자 이내여야 합니다.';
            submitBtn.disabled = true;
        } else {
            titleWarning.textContent = '';
            submitBtn.disabled = false;
        }
    });

    async function fetchItems() {
        try {
            const res = await fetch('/api/items');
            if (!res.ok) throw new Error("서버 에러");
            return await res.json();
        } catch {
            itemList.innerHTML = `<p style="color:red;"> 서버에서 데이터를 불러올 수 없습니다.</p>`;
            return [];
        }
    }

    window.toggleStatus = async (id) => {
        try {
            const res = await fetch(`/api/items/${id}`, { method: 'PATCH' });
            if (!res.ok) throw new Error();
            loadAndRender();
        } catch {
            alert("상태 전환 실패");
        }
    };

    window.deleteItem = async (id) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            loadAndRender();
        } catch {
            alert("삭제 실패");
        }
    };

    window.editItem = function (item) {
        const oldForm = document.querySelector('.inline-edit-form');
        if (oldForm) oldForm.remove();

        if (currentView === 'card') {
            const cards = [...document.querySelectorAll('.card')];
            const card = cards.find(c => c.querySelector('h3').textContent === item.title);
            if (!card) return;

            const form = document.createElement('div');
            form.className = 'inline-edit-form';
            form.innerHTML = `
        <input type="text" value="${item.title}" />
        <input type="date" value="${item.deadline}" />
        <button class="save-btn">수정 완료</button>
        <button class="cancel-btn">취소</button>
      `;

            card.innerHTML = '';
            card.appendChild(form);

            form.querySelector('.save-btn').addEventListener('click', async () => {
                const newTitle = form.querySelector('input[type="text"]').value.trim();
                const newDeadline = form.querySelector('input[type="date"]').value;
                if (!newTitle || !newDeadline) return alert("입력 확인");

                await fetch(`/api/items/${item.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle, deadline: newDeadline })
                });
                loadAndRender();
            });

            form.querySelector('.cancel-btn').addEventListener('click', loadAndRender);

        } else {
            const rows = [...document.querySelectorAll("tbody tr")];
            const targetRow = rows.find(r => r.querySelector("td")?.textContent === item.title);
            if (!targetRow) return;

            
            const formRow = document.createElement("tr");
            formRow.className = "inline-edit-row";
            formRow.innerHTML = `
  <td colspan="6">
    <form class="inline-edit-form">
      <input type="text" value="${item.title}" />
      <input type="date" value="${item.deadline}" />
      <button type="submit">수정 완료</button>
      <button type="button" class="cancel-btn">취소</button>
    </form>
  </td>
`;

            targetRow.replaceWith(formRow);

            const innerForm = formRow.querySelector("form");
            innerForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const newTitle = innerForm.querySelector('input[type="text"]').value.trim();
                const newDeadline = innerForm.querySelector('input[type="date"]').value;
                if (!newTitle || !newDeadline) return alert("입력 확인");

                await fetch(`/api/items/${item.id}`, {
                    method: "PUT",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle, deadline: newDeadline })
                });
                loadAndRender();
            });

            innerForm.querySelector('.cancel-btn').addEventListener('click', loadAndRender);
        }
    };

    function applyFilter(items) {
        if (currentFilter === 'sold') return items.filter(i => i.isSold);
        if (currentFilter === 'unsold') return items.filter(i => !i.isSold);
        return items;
    }

    function renderAsTable(items) {
        itemList.innerHTML = "";
        items = applyFilter(items);

        const table = document.createElement("table");
        table.innerHTML = `
      <thead>
        <tr>
          <th>물품명</th><th>마감일</th><th>상태</th><th>전환</th><th>삭제</th><th>수정</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.title}</td>
            <td class="${new Date(item.deadline) < new Date() ? 'expired' : ''}">${item.deadline}</td>
            <td>${item.isSold ? "✅ 거래완료" : "🟡 거래중"}</td>
            <td><button onclick="toggleStatus(${item.id})">상태 전환</button></td>
            <td><button onclick="deleteItem(${item.id})">삭제</button></td>
            <td><button onclick='editItem(${JSON.stringify(item)})'>수정</button></td>
          </tr>
        `).join('')}
      </tbody>
    `;
        itemList.appendChild(table);
    }

    function renderAsCards(items) {
        itemList.innerHTML = "";
        items = applyFilter(items);

        const container = document.createElement("div");
        container.className = "card-container";

        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
        <h3>${item.title}</h3>
        <p>📅 <span class="${new Date(item.deadline) < new Date() ? 'expired' : ''}">${item.deadline}</span></p>
        <p>${item.isSold ? "✅ 거래완료" : "🟡 거래중"}</p>
        <button onclick="toggleStatus(${item.id})">상태 전환</button>
        <button onclick="deleteItem(${item.id})">삭제</button>
        <button onclick='editItem(${JSON.stringify(item)})'>수정</button>
      `;
            container.appendChild(card);
        });

        itemList.appendChild(container);
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const deadline = deadlineInput.value;

        if (!title || !deadline || title.length < 2 || title.length > 20) {
            return alert("값 확인");
        }

        if (editingItemId !== null) {
            await fetch(`/api/items/${editingItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, deadline })
            });
            editingItemId = null;
            submitBtn.textContent = "등록(추가)";
            submitBtn.classList.remove("editing");
        } else {
            await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, deadline })
            });
        }

        titleInput.value = "";
        deadlineInput.value = "";
        submitBtn.disabled = true;
        loadAndRender();
    });

    toggleViewBtn.addEventListener("click", () => {
        currentView = currentView === 'table' ? 'card' : 'table';
        loadAndRender();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadAndRender();
        });
    });

    sortButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            currentSort = btn.dataset.sort;
            sortButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadAndRender();
        });
    });
    async function loadAndRender() {
        let items = await fetchItems();
        const keyword = searchInput.value.trim().toLowerCase();
        if (keyword) items = items.filter(i => i.title.toLowerCase().includes(keyword));

        
        items.sort((a, b) => {
            if (currentSort === 'asc') {
                return new Date(a.deadline) - new Date(b.deadline);
            } else {
                return new Date(b.deadline) - new Date(a.deadline);
            }
        });

        currentView === 'table' ? renderAsTable(items) : renderAsCards(items);
    }


    loadAndRender();
});
