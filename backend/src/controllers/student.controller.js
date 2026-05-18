import Class from '../models/class.model.js';
import Student from '../models/student.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
  Get class ONLY if this teacher owns it.
  Find class
     ↓
 Check exists
     ↓
Check ownership
     ↓
 Return class
*/
const getOwnedClass = async (classId, userId) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new ApiError(404, 'Class not found');
  }
// Ownership check : Does this class belong to current teacher?
  if (!classDoc.createdBy.equals(userId)) {
    throw new ApiError(403, 'You are not authorized to access this class');
  }
// Ownership verified successfully
  return classDoc;
};
// Get student ONLY if student belongs to teacher.
const getStudentOwnedByTeacher = async (studentId, userId) => {
  const student = await Student.findById(studentId);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  await getOwnedClass(student.classId, userId);
  return student;
};

/**
 * Add student to a class — class must exist and belong to logged-in teacher.
  Find student
      ↓
  Get student's class
      ↓
  Check teacher owns class
      ↓
  Return student
 */
const addStudent = asyncHandler(async (req, res) => {
  const { name, rollNumber, email, classId } = req.body;

  if (
    [name, email, classId].some((field) => field?.toString().trim() === '') ||
    rollNumber === undefined ||
    rollNumber === null ||
    rollNumber === ''
  ) {
    throw new ApiError(400, 'Name, roll number, email, and class are required');
  }

  const parsedRoll = Number(rollNumber);
  if (!Number.isInteger(parsedRoll) || parsedRoll < 1) {
    throw new ApiError(400, 'Roll number must be a positive integer');
  }

  await getOwnedClass(classId, req.user._id);

  let student;
  try {
    student = await Student.create({
      name: name.trim(),
      rollNumber: parsedRoll,
      email: email.trim(),
      classId,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'Roll number already exists in this class');
    }
    throw err;
  }

  const populatedStudent = await Student.findById(student._id).populate(
    'classId',
    'className section'
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedStudent, 'Student added successfully'));
});

/**
 * Get all students for a class — only if class belongs to logged-in teacher.
 */
const getStudentsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  await getOwnedClass(classId, req.user._id);

  const students = await Student.find({ classId }).populate(
    'classId',
    'className section'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, students, 'Students fetched successfully'));
});

/**
 * Update student — only if student's class belongs to logged-in teacher.
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, rollNumber, email } = req.body;

  const student = await getStudentOwnedByTeacher(id, req.user._id);

  const updates = {};

  if (name !== undefined) {
    if (name.trim() === '') {
      throw new ApiError(400, 'Name cannot be empty');
    }
    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (email.trim() === '') {
      throw new ApiError(400, 'Email cannot be empty');
    }
    updates.email = email.trim();
  }

  if (rollNumber !== undefined) {
    const parsedRoll = Number(rollNumber);
    if (!Number.isInteger(parsedRoll) || parsedRoll < 1) {
      throw new ApiError(400, 'Roll number must be a positive integer');
    }
    updates.rollNumber = parsedRoll;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'At least one field is required to update');
  }

  let updatedStudent;
  try {
    updatedStudent = await Student.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('classId', 'className section');
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'Roll number already exists in this class');
    }
    throw err;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedStudent, 'Student updated successfully'));
});

/**
 * Delete student — only if student's class belongs to logged-in teacher.
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await getStudentOwnedByTeacher(id, req.user._id);

  await Student.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Student deleted successfully'));
});

export { addStudent, getStudentsByClass, updateStudent, deleteStudent };

