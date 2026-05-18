/**
 * Students — CRUD by class (Phase 5)
 */

let allStudents = [];
let classesCache = [];
let editingStudentId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await AppLayout.init('students');
  setupStudentModal();
  await loadClassesForFilters();
  await loadAllStudents();

  document.getElementById('classFilter')?.addEventListener('change', renderStudentsTable);
  document.getElementById('studentSearch')?.addEventListener('input', renderStudentsTable);

  document.getElementById('addStudentBtn')?.addEventListener('click', () => {
    editingStudentId = null;
    document.getElementById('studentModalTitle').textContent = 'Add Student';
    document.getElementById('studentForm')?.reset();
    const sel = document.getElementById('studentClass');
    if (sel) sel.disabled = false;
    document.getElementById('studentModal')?.classList.add('open');
  });
});

function setupStudentModal() {
  const modal = document.getElementById('studentModal');
  const closeModal = () => {
    modal?.classList.remove('open');
    document.getElementById('studentForm')?.reset();
    editingStudentId = null;
    const sel = document.getElementById('studentClass');
    if (sel) sel.disabled = false;
  };

  document.getElementById('closeStudentModal')?.addEventListener('click', closeModal);
  document.getElementById('cancelStudentModal')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('studentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('studentName')?.value.trim();
    const rollNumber = document.getElementById('rollNumber')?.value.trim();
    const email = document.getElementById('studentEmail')?.value.trim();
    const classId = document.getElementById('studentClass')?.value;
    const submitBtn = e.target.querySelector('[type="submit"]');

    if (!name || !rollNumber || !email || !classId) {
      Toast.error('All fields are required.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Saving…');

    try {
      if (editingStudentId) {
        await API.students.update(editingStudentId, { name, rollNumber, email });
        Toast.success('Student updated');
      } else {
        await API.students.create({ name, rollNumber, email, classId });
        Toast.success('Student added');
      }
      closeModal();
      await loadAllStudents();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

async function loadClassesForFilters() {
  const classSelect = document.getElementById('studentClass');
  const classFilter = document.getElementById('classFilter');

  try {
    const res = await API.classes.list();
    classesCache = Array.isArray(res.data) ? res.data : [];

    const options = classesCache
      .map(
        (c) =>
          `<option value="${c._id}">${escapeHtml(c.className)} — ${escapeHtml(c.section)}</option>`
      )
      .join('');

    if (classSelect) {
      classSelect.innerHTML = `<option value="">Select class</option>${options}`;
    }
    if (classFilter) {
      classFilter.innerHTML = `<option value="">All Classes</option>${options}`;
    }

    const preselect = new URLSearchParams(window.location.search).get('classId');
    if (preselect && classFilter) classFilter.value = preselect;
  } catch (err) {
    Toast.error(err.message);
  }
}

async function loadAllStudents() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Loading students…</td></tr>`;

  try {
    if (!classesCache.length) {
      const res = await API.classes.list();
      classesCache = Array.isArray(res.data) ? res.data : [];
    }

    if (!classesCache.length) {
      allStudents = [];
      renderStudentsTable();
      return;
    }

    const results = await Promise.all(
      classesCache.map((c) => API.students.byClass(c._id).catch(() => ({ data: [] })))
    );
    allStudents = results.flatMap((r) => (Array.isArray(r.data) ? r.data : []));
    renderStudentsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state error">${escapeHtml(err.message)}</td></tr>`;
    Toast.error(err.message);
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const filterClass = document.getElementById('classFilter')?.value || '';
  const search = (document.getElementById('studentSearch')?.value || '').toLowerCase();

  let list = [...allStudents];
  if (filterClass) {
    list = list.filter((s) => (s.classId?._id || s.classId) === filterClass);
  }
  if (search) {
    list = list.filter(
      (s) =>
        s.name?.toLowerCase().includes(search) ||
        String(s.rollNumber).includes(search) ||
        s.email?.toLowerCase().includes(search)
    );
  }

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No students found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map((s) => {
      const classLabel = s.classId
        ? `${s.classId.className || ''} — ${s.classId.section || ''}`.trim()
        : '—';
      return `
      <tr>
        <td>
          <div class="student-cell">
            <div class="student-avatar-sm">${studentInitials(s.name)}</div>
            <span>${escapeHtml(s.name)}</span>
          </div>
        </td>
        <td>${s.rollNumber}</td>
        <td>${escapeHtml(classLabel)}</td>
        <td><span class="badge badge-success">Active</span></td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-edit="${s._id}">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete="${s._id}">Remove</button>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const student = allStudents.find((s) => s._id === btn.dataset.edit);
      if (!student) return;
      editingStudentId = student._id;
      document.getElementById('studentModalTitle').textContent = 'Edit Student';
      document.getElementById('studentName').value = student.name;
      document.getElementById('rollNumber').value = student.rollNumber;
      document.getElementById('studentEmail').value = student.email;
      document.getElementById('studentClass').value = student.classId?._id || student.classId || '';
      document.getElementById('studentClass').disabled = true;
      document.getElementById('studentModal')?.classList.add('open');
    });
  });

  tbody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const student = allStudents.find((s) => s._id === btn.dataset.delete);
      if (!student) return;
      const ok = await ConfirmModal.ask(`Remove ${student.name} from the system?`, {
        title: 'Remove student?',
        confirmLabel: 'Remove',
      });
      if (!ok) return;
      setButtonLoading(btn, true, '…');
      try {
        await API.students.delete(student._id);
        Toast.success('Student removed');
        await loadAllStudents();
      } catch (err) {
        Toast.error(err.message);
        setButtonLoading(btn, false);
      }
    });
  });
}

function studentInitials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str ?? '';
  return el.innerHTML;
}
