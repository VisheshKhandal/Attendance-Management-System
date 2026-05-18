import Class from '../models/class.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Create class — createdBy comes from req.user (JWT), never from frontend.
 */
const createClass = asyncHandler(async (req, res) => {
  const { className, section } = req.body;

  if ([className, section].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'Class name and section are required');
  }

  const newClass = await Class.create({
    className: className.trim(),
    section: section.trim(),
    createdBy: req.user._id,
  });
/**
 * Think of populate() as a "Search & Replace" tool for your database. 
 * It looks for a specific ID and replaces it with the actual information that ID represents.
 */
  const populatedClass = await Class.findById(newClass._id).populate(
    'createdBy',
    'username email'
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedClass, 'Class created successfully'));
});

/**
 * Get all classes — only those owned by the logged-in teacher.
 */
const getMyClasses = asyncHandler(async (req, res) => {
  const classes = await Class.find({ createdBy: req.user._id }).populate(
    'createdBy',
    'username email'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, classes, 'Classes fetched successfully'));
});

/**
 * Delete class — only if createdBy matches req.user (ownership check).
 */
const deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classDoc = await Class.findById(id);

  if (!classDoc) {
    throw new ApiError(404, 'Class not found');
  }

  if (!classDoc.createdBy.equals(req.user._id)) {
    throw new ApiError(403, 'You are not authorized to delete this class');
  }

  await Class.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Class deleted successfully'));
});

export { createClass, getMyClasses, deleteClass };
