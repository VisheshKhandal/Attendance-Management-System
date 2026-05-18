import Class from '../models/class.model.js';
import Student from '../models/student.model.js';
import Attendance from '../models/attendance.model.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getStartOfDay = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const classIds = await Class.find({ createdBy: userId }).distinct('_id');

  const today = getStartOfDay();
  const classFilter = classIds.length ? { class: { $in: classIds } } : { class: null };

  const [totalClasses, totalStudents, attendanceToday, presentToday, totalRecords, totalPresent] =
    await Promise.all([
      Class.countDocuments({ createdBy: userId }),
      classIds.length
        ? Student.countDocuments({ classId: { $in: classIds } })
        : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...classFilter, date: today })
        : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...classFilter, date: today, status: 'Present' })
        : Promise.resolve(0),
      classIds.length ? Attendance.countDocuments(classFilter) : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...classFilter, status: 'Present' })
        : Promise.resolve(0),
    ]);

  const absentToday = attendanceToday - presentToday;
  const attendancePercentage =
    totalRecords === 0 ? 0 : Math.round((totalPresent / totalRecords) * 10000) / 100;

  const weeklyTrend = [];
  let thisWeekPresent = 0;
  let thisWeekMarked = 0;
  let lastWeekPresent = 0;
  let lastWeekMarked = 0;

  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const dayStart = getStartOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const dayFilter = classIds.length
      ? { ...classFilter, date: { $gte: dayStart, $lt: dayEnd } }
      : { class: null };

    const [marked, present] = await Promise.all([
      classIds.length ? Attendance.countDocuments(dayFilter) : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...dayFilter, status: 'Present' })
        : Promise.resolve(0),
    ]);

    thisWeekPresent += present;
    thisWeekMarked += marked;

    weeklyTrend.push({
      date: dayStart.toISOString().split('T')[0],
      label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      marked,
      present,
      absent: marked - present,
      rate: marked === 0 ? 0 : Math.round((present / marked) * 100),
    });
  }

  for (let i = 13; i >= 7; i -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const dayStart = getStartOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const dayFilter = classIds.length
      ? { ...classFilter, date: { $gte: dayStart, $lt: dayEnd } }
      : { class: null };

    const [marked, present] = await Promise.all([
      classIds.length ? Attendance.countDocuments(dayFilter) : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...dayFilter, status: 'Present' })
        : Promise.resolve(0),
    ]);

    lastWeekPresent += present;
    lastWeekMarked += marked;
  }

  const thisWeekRate = thisWeekMarked === 0 ? 0 : (thisWeekPresent / thisWeekMarked) * 100;
  const lastWeekRate = lastWeekMarked === 0 ? 0 : (lastWeekPresent / lastWeekMarked) * 100;
  const weekOverWeekChange = Math.round((thisWeekRate - lastWeekRate) * 10) / 10;

  const classComparison = await Promise.all(
    (await Class.find({ createdBy: userId }).select('className section')).map(async (cls) => {
      const total = await Attendance.countDocuments({ class: cls._id });
      const present = await Attendance.countDocuments({
        class: cls._id,
        status: 'Present',
      });
      const rate = total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
      return {
        classId: cls._id,
        name: `${cls.className} — ${cls.section}`,
        total,
        present,
        absent: total - present,
        rate,
      };
    })
  );

  const totalAbsent = totalRecords - totalPresent;
  const distribution = {
    present: totalPresent,
    absent: totalAbsent,
    presentPercent: attendancePercentage,
    absentPercent: totalRecords === 0 ? 0 : Math.round((totalAbsent / totalRecords) * 10000) / 100,
  };

  const heatmap = [];
  for (let i = 83; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const dayStart = getStartOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const dayFilter = classIds.length
      ? { ...classFilter, date: { $gte: dayStart, $lt: dayEnd } }
      : { class: null };

    const count = classIds.length ? await Attendance.countDocuments(dayFilter) : 0;

    heatmap.push({
      date: dayStart.toISOString().split('T')[0],
      count,
      level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4,
    });
  }

  const [recentAttendance, recentClasses, recentStudents] = await Promise.all([
    Attendance.find({ markedBy: userId })
      .sort({ updatedAt: -1 })
      .limit(12)
      .populate('student', 'name')
      .populate('class', 'className section'),
    Class.find({ createdBy: userId }).sort({ createdAt: -1 }).limit(4).select('className section createdAt'),
    classIds.length
      ? Student.find({ classId: { $in: classIds } })
          .sort({ createdAt: -1 })
          .limit(4)
          .select('name createdAt')
      : Promise.resolve([]),
  ]);

  const recentActivity = [];

  recentAttendance.forEach((a) => {
    const studentName = a.student?.name || 'Student';
    const classLabel = a.class ? `${a.class.className} — ${a.class.section}` : 'class';
    const isPresent = a.status === 'Present';
    recentActivity.push({
      type: 'attendance',
      variant: isPresent ? 'present' : 'absent',
      text: `${studentName} marked ${a.status.toLowerCase()} in ${classLabel}`,
      at: a.updatedAt || a.createdAt,
    });
  });

  recentStudents.forEach((s) => {
    recentActivity.push({
      type: 'student',
      variant: 'student',
      text: `New student added: ${s.name}`,
      at: s.createdAt,
    });
  });

  recentClasses.forEach((c) => {
    recentActivity.push({
      type: 'class',
      variant: 'class',
      text: `Class created: ${c.className} — ${c.section}`,
      at: c.createdAt,
    });
  });

  recentActivity.sort((a, b) => new Date(b.at) - new Date(a.at));

  let healthLabel = 'Getting started';
  let healthLevel = 'neutral';
  if (attendancePercentage >= 85) {
    healthLabel = 'Excellent';
    healthLevel = 'excellent';
  } else if (attendancePercentage >= 70) {
    healthLabel = 'Good';
    healthLevel = 'good';
  } else if (totalRecords > 0) {
    healthLabel = 'Needs attention';
    healthLevel = 'warning';
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalClasses,
        totalStudents,
        attendanceToday,
        presentToday,
        absentToday,
        attendancePercentage,
        weekOverWeekChange,
        weeklyTrend,
        classComparison,
        distribution,
        heatmap,
        recentActivity: recentActivity.slice(0, 15),
        todaySummary: {
          present: presentToday,
          absent: absentToday,
          marked: attendanceToday,
        },
        health: { label: healthLabel, level: healthLevel },
      },
      'Dashboard stats fetched successfully'
    )
  );
});

export { getDashboardStats };
