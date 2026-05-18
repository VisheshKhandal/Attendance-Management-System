/**
 * Classes — create, list, delete (Phase 4)
 */

let classesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await AppLayout.init('classes');
  setupClassModal();
  await loadClasses();
});

function setupClassModal() {
  const addClassBtn = document.getElementById('addClassBtn');
  const modal = document.getElementById('classModal');
  const closeModalBtn = document.getElementById('closeClassModal');
  const cancelModalBtn = document.getElementById('cancelClassModal');

  const openModal = () => modal?.classList.add('open');
  const closeModal = () => {
    modal?.classList.remove('open');
    document.getElementById('classForm')?.reset();
  };

  addClassBtn?.addEventListener('click', openModal);
  closeModalBtn?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('classForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const className = document.getElementById('className')?.value.trim();
    const section = document.getElementById('classSection')?.value.trim();
    const submitBtn = e.target.querySelector('[type="submit"]');

    if (!className || !section) {
      Toast.error('Class name and section are required.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Saving…');
    try {
      await API.classes.create({ className, section });
      Toast.success('Class created successfully');
      closeModal();
      await loadClasses();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

async function loadClasses() {
  const grid = document.getElementById('classesGrid');
  if (!grid) return;

  grid.innerHTML = '<p class="empty-state">Loading classes…</p>';

  try {
    const res = await API.classes.list();
    classesCache = Array.isArray(res.data) ? res.data : [];
    renderClasses(grid, classesCache);
  } catch (err) {
    grid.innerHTML = `<p class="empty-state error">${err.message}</p>`;
    Toast.error(err.message);
  }
}

function renderClasses(grid, classes) {
  if (!classes.length) {
    grid.innerHTML =
      '<p class="empty-state">No classes yet. Click <strong>+ Add Class</strong> to create one.</p>';
    return;
  }

  grid.innerHTML = classes
    .map(
      (c) => `
    <article class="class-card" data-id="${c._id}">
      <div class="class-card-header">
        <h3 class="class-name">${escapeHtml(c.className)} — ${escapeHtml(c.section)}</h3>
        <span class="badge badge-success">Active</span>
      </div>
      <p class="class-meta">Section ${escapeHtml(c.section)}</p>
      <div class="class-actions">
        <a href="students.html?classId=${c._id}" class="btn btn-secondary btn-sm">Students</a>
        <button type="button" class="btn btn-danger btn-sm" data-delete-class="${c._id}">Delete</button>
      </div>
    </article>
  `
    )
    .join('');

  grid.querySelectorAll('[data-delete-class]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteClass;
      const item = classesCache.find((c) => c._id === id);
      const label = item ? `${item.className} (${item.section})` : 'this class';
      const ok = await ConfirmModal.ask(
        `Delete ${label}? Students in this class may become inaccessible.`,
        { title: 'Delete class?', confirmLabel: 'Delete' }
      );
      if (!ok) return;

      setButtonLoading(btn, true, '…');
      try {
        await API.classes.delete(id);
        Toast.success('Class deleted');
        await loadClasses();
      } catch (err) {
        Toast.error(err.message);
        setButtonLoading(btn, false);
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
