const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;
const dataPath = path.join(__dirname, 'simple_todos_v4.json');
 // 빈 배열 리스트(데이터베이스) (simple_todos_v4.json)경로

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(__dirname));

// 데이터 불러오기
async function loadItems() {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.warn(" 오류 발생하여 페이지 초기화");
    return [];
  }
}

// 데이터 저장
async function saveItems(items) {
  await fs.writeFile(dataPath, JSON.stringify(items, null, 2), 'utf8');
}

// 전체 조회
app.get('/api/items', async (req, res) => {
  const items = await loadItems();
  res.json(items);
});

// 등록
app.post('/api/items', async (req, res) => {
  const { title, deadline } = req.body;
  if (!title?.trim() || !deadline) {
    return res.status(400).json({ error: '제목과 마감기한은 필수입니당~!' });
  }

  const items = await loadItems();
  const newId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;

  const newItem = {
    id: newId,
    title: title.trim(),
    deadline,
    isSold: false
  };

  items.push(newItem);
  await saveItems(items);
  res.status(201).json(newItem);
});

// 상태 전환
app.patch('/api/items/:id', async (req, res) => {
  const itemId = parseInt(req.params.id);
  const items = await loadItems();
  const index = items.findIndex(i => i.id === itemId);

  if (index === -1) {
    return res.status(404).json({ error: '해당 항목을 찾을 수 업습니다!' });
  }

  items[index].isSold = !items[index].isSold;
  await saveItems(items);
  res.json(items[index]);
});

// 삭제
app.delete('/api/items/:id', async (req, res) => {
  const itemId = parseInt(req.params.id);
  const items = await loadItems();
  const index = items.findIndex(i => i.id === itemId);

  if (index === -1) {
    return res.status(404).json({ error: '삭제할 항목을 찾을 수 없습니다!' });
  }

  items.splice(index, 1);
  await saveItems(items);
  res.status(204).send();
});

// 수정
app.put('/api/items/:id', async (req, res) => {
  const itemId = parseInt(req.params.id);
  const { title, deadline } = req.body;

  if (!title?.trim() || !deadline) {
    return res.status(400).json({ error: '제목과 마감기한은 필수입니다!.' });
  }

  const items = await loadItems();
  const index = items.findIndex(i => i.id === itemId);

  if (index === -1) {
    return res.status(404).json({ error: '수정할 항목을 찾을 수 없습니다.' });
  }

  items[index].title = title.trim();
  items[index].deadline = deadline;
  await saveItems(items);
  res.json(items[index]);
});

// 서버 시작
app.listen(port, () => {
  console.log(`창원대 중고마켓 서버 실행 중 → http://localhost:${port}`);
});
