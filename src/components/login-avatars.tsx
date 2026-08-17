/**
 * Direct static images from public/avatars/ directory
 */

export const StudentAvatar = () => (
  <img
    src="/avatars/student.png"
    alt="Student Avatar"
    className="w-full h-full object-cover rounded-full select-none pointer-events-none"
  />
);

export const TeacherAvatar = () => (
  <img
    src="/avatars/teacher.png"
    alt="Teacher Avatar"
    className="w-full h-full object-cover rounded-full select-none pointer-events-none"
  />
);

export const ParentAvatar = () => (
  <img
    src="/avatars/parent.png"
    alt="Parent Avatar"
    className="w-full h-full object-cover rounded-full select-none pointer-events-none"
  />
);