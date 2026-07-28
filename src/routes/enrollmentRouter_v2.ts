import { Router, type Request, type Response } from "express";
import {
  zEnrollmentBody,
  zStudentId,
  zCourseId,
} from "../libs/zodValidators.js";

import type { Student, Course, Enrollment, User, UserPayload, CustomRequest } from "../libs/types.ts";

// import database
import { DB, students, courses, enrollments } from "../db/db.js";
import { users, reset_users } from "../db/db.ts";
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.ts";
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesMiddleware.ts";


const router = Router();

router.get("/", authenticateToken, checkRoles,(req: CustomRequest, res: Response) => {
  try{
    const payload = req.user;

    if( payload?.role === "ADMIN"){
      return res.status(200).json({
        ok: true,
        enrollments: enrollments
      });
    }

    if( payload?.role === "STUDENT") {
      return res.status(200).json({
        ok: true,
        enrollments: enrollments.filter((e) => e.studentId === payload?.studentId)
      })
    }

    return res.status(403).json({
      ok: false,
      message: "Forbidden"
    });

  }catch(err){
    return res.status(500).json({
        ok: false,
        message: "Something is wrong, please try again",
        error: err,
      });
  };
})

router.post("/", authenticateToken, checkRoleStudent, async (req: CustomRequest, res: Response) => {
  try{
    const payload = req.user;
    const body = (await req.body) as Enrollment;
    
      // validate req.body with predefined validator
      const result = zEnrollmentBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          ok: false,
          message: "Validation failed",
        });
      }

    //check duplicate studentId
    const found = enrollments.find(
      (e) => e.courseId === body.courseId && e.studentId === payload?.studentId
    );
    if (found) {
      return res.status(409).json({
        ok: false,
        message: "Enrollment is already exists",
      });
    }

    // add new student
    const new_enrollment: Enrollment = {
    studentId: payload?.studentId!,
    courseId: body.courseId,
    };
    enrollments.push(new_enrollment);

    return res.status(201).json({
      ok: true,
      data: new_enrollment,
    });

  }catch(err){
    return res.status(500).json({
        ok: false,
        message: "Something is wrong, please try again",
        error: err,
      });
  };
})

router.delete("/", authenticateToken, checkRoleStudent, (req: CustomRequest, res: Response) => {
  try {
    const payload = req.user;
    const body = req.body;
    const parseResult = zCourseId.safeParse(body.courseId);

    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        message: "Validation failed",
      });
    }

    const foundIndex = enrollments.findIndex(
      (e) => e.courseId === body.courseId && payload?.studentId === e.studentId
    );

    if (foundIndex === -1) {
      return res.status(404).json({
        ok: false,
        message: "CouresId does not exists",
      });
    }

    // delete found student from array
    DB.enrollments.splice(foundIndex, 1);

    return res.status(200).json({
      ok: true,
      message: `You has dropped from this course. See you next semester.`
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Somthing is wrong, please try again",
      error: err,
    });
  }
});

export default router;