const elements = {
  date: document.querySelector('#today-label'),
  progress: document.querySelector('#progress-fraction'),
  form: document.querySelector('#add-form'),
  input: document.querySelector('#task-input'),
  addButton: document.querySelector('#add-button'),
  error: document.querySelector('#input-error'),
  activeList: document.querySelector('#active-list'),
  completedList: document.querySelector('#completed-list'),
  empty: document.querySelector('#empty-state'),
  archiveToggle: document.querySelector('#archive-toggle'),
  completedCount: document.querySelector('#completed-count'),
  layerStatus: document.querySelector('#layer-status'),
  close: document.querySelector('.window-close')
};

let state = { tasks: [], archiveOpen: false };
let saveTimer;

function formatToday() {
  const value = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date());
  elements.date.textContent = value.replace('周', '星期');
  elements.date.dateTime = new Date().toISOString().slice(0, 10);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.desktopAPI.save(state), 100);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTaskRow(task) {
  const item = document.createElement('li');
  item.className = 'task-row';
  item.dataset.id = task.id;

  const check = document.createElement('button');
  check.className = 'task-check';
  check.type = 'button';
  check.setAttribute('role', 'checkbox');
  check.setAttribute('aria-checked', String(task.completed));
  check.setAttribute('aria-label', task.completed ? `将“${task.text}”标为未完成` : `完成“${task.text}”`);

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;

  const remove = document.createElement('button');
  remove.className = 'task-delete';
  remove.type = 'button';
  remove.textContent = '×';
  remove.setAttribute('aria-label', `删除“${task.text}”`);
  remove.title = '删除任务';

  item.append(check, text, remove);
  return item;
}

function render() {
  const active = state.tasks.filter((task) => !task.completed);
  const completed = state.tasks.filter((task) => task.completed);

  elements.activeList.replaceChildren(...active.map(createTaskRow));
  elements.completedList.replaceChildren(...completed.map(createTaskRow));
  elements.completedList.hidden = !state.archiveOpen;
  elements.archiveToggle.setAttribute('aria-expanded', String(state.archiveOpen));
  elements.completedCount.textContent = String(completed.length);
  elements.empty.hidden = active.length > 0;
  elements.progress.textContent = `${completed.length} / ${state.tasks.length}`;
  elements.progress.setAttribute('aria-label', `已完成 ${completed.length} 项，共 ${state.tasks.length} 项`);
}

function setError(message = '') {
  elements.error.textContent = message;
  elements.error.hidden = !message;
  elements.input.setAttribute('aria-invalid', String(Boolean(message)));
}

function addTask(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    setError('先写下一件要做的事。');
    elements.input.focus();
    return;
  }

  state.tasks.unshift({
    id: makeId(),
    text: normalized,
    completed: false,
    createdAt: new Date().toISOString()
  });
  elements.input.value = '';
  elements.form.classList.remove('has-value');
  setError();
  render();
  scheduleSave();
  elements.input.focus();
}

function updateTask(id, action) {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;
  if (action === 'toggle') {
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
  } else if (action === 'delete') {
    state.tasks = state.tasks.filter((entry) => entry.id !== id);
  }
  render();
  scheduleSave();
}

function handleListClick(event) {
  const row = event.target.closest('.task-row');
  if (!row) return;
  if (event.target.closest('.task-check')) updateTask(row.dataset.id, 'toggle');
  if (event.target.closest('.task-delete')) updateTask(row.dataset.id, 'delete');
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask(elements.input.value);
});

elements.form.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  window.desktopAPI.focus().then(() => {
    elements.input.focus({ preventScroll: true });
  });
});

elements.input.addEventListener('input', () => {
  elements.form.classList.toggle('has-value', Boolean(elements.input.value));
  if (elements.input.value.trim()) setError();
});

elements.input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    elements.input.value = '';
    elements.form.classList.remove('has-value');
    setError();
  }
});

elements.activeList.addEventListener('click', handleListClick);
elements.completedList.addEventListener('click', handleListClick);

elements.archiveToggle.addEventListener('click', () => {
  state.archiveOpen = !state.archiveOpen;
  render();
  scheduleSave();
});

elements.close.addEventListener('click', async () => {
  elements.close.disabled = true;
  try {
    await window.desktopAPI.close(state);
  } finally {
    elements.close.disabled = false;
  }
});

elements.layerStatus.addEventListener('click', async () => {
  elements.layerStatus.disabled = true;
  const status = await window.desktopAPI.reattach();
  updateLayerStatus(status);
  elements.layerStatus.disabled = false;
});

function updateLayerStatus(status) {
  elements.layerStatus.classList.toggle('is-error', !status.ok);
  elements.layerStatus.title = status.message;
  elements.layerStatus.setAttribute('aria-label', status.message);
}

window.desktopAPI.onDesktopStatus(updateLayerStatus);
window.desktopAPI.onFocusInput(() => {
  elements.input.focus({ preventScroll: true });
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    elements.input.focus();
  }
});

formatToday();
window.desktopAPI.load().then((saved) => {
  state = {
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
    archiveOpen: Boolean(saved.archiveOpen)
  };
  render();
});
