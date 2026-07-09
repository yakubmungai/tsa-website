'use server';

import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Middleware check for admin authentication
async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
}

// Post a new transaction ledger record to update a member's balance
export async function postTransaction(values: {
  memberId: string;
  amount: number;
  type: 'ADVANCE' | 'REGISTRATION' | 'MEMBERSHIP' | 'OTHER';
  description: string;
}) {
  try {
    await verifyAdmin();
    const { memberId, amount, type, description } = values;

    await db.transaction.create({
      data: {
        memberId,
        amount,
        type,
        description,
      },
    });

    revalidatePath(`/admin/members/${memberId}`);
    revalidatePath('/portal');
    return { success: true };
  } catch (err: any) {
    console.error('Error posting transaction:', err);
    return { success: false, error: err.message || 'Failed to post transaction.' };
  }
}

// Update a member's profile details
export async function updateMemberDetails(memberId: string, data: any) {
  try {
    await verifyAdmin();

    await db.member.update({
      where: { id: memberId },
      data: {
        names: data.names,
        phone: data.phone,
        address: data.address,
        husbandWife: data.husbandWife,
        spousePhone: data.spousePhone,
        parents: data.parents || [],
        children: data.children || [],
        siblings: data.siblings || [],
        witnesses: data.witnesses || [],
        nextOfKin: data.nextOfKin || [],
      },
    });

    revalidatePath(`/admin/members/${memberId}`);
    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating member details:', err);
    return { success: false, error: err.message || 'Failed to update details.' };
  }
}

// Delete a member profile
export async function deleteMember(memberId: string) {
  try {
    await verifyAdmin();

    await db.member.delete({
      where: { id: memberId },
    });

    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting member:', err);
    return { success: false, error: err.message || 'Failed to delete member.' };
  }
}

// Approve a form submission
export async function approveSubmission(submissionId: string) {
  try {
    await verifyAdmin();

    const submission = await db.formSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) throw new Error('Submission not found.');

    // If onboarding application, automatically spawn a new Member profile!
    if (submission.formType === 'MEMBERSHIP') {
      const payload = submission.data as any;
      const names = `${payload.firstName} ${payload.lastName}`;

      // Aggregate parents/relations
      const parents = [];
      if (payload.fatherName) parents.push(payload.fatherName);
      if (payload.motherName) parents.push(payload.motherName);

      const children = (payload.children || []).map((c: any) => c.name);
      const siblings = (payload.siblings || []).map((s: any) => s.name);
      const witnesses = (payload.witnesses || []).map((w: any) => ({ name: w.name, phone: w.phone }));
      const nextOfKin = (payload.funeralSupervisors || []).map((fs: any) => ({ name: fs.name, phone: fs.phone }));

      await db.$transaction(async (tx) => {
        const newMember = await tx.member.create({
          data: {
            names,
            phone: payload.phone,
            address: `${payload.streetAddress}, ${payload.city}, ${payload.state} ${payload.zipCode}`,
            husbandWife: payload.spouseName || null,
            spousePhone: payload.spousePhone || null,
            parents,
            children,
            siblings,
            witnesses,
            nextOfKin,
          },
        });

        // Update submission with the spawned memberId
        await tx.formSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'APPROVED',
            memberId: newMember.id,
          },
        });
      });
    } else {
      await db.formSubmission.update({
        where: { id: submissionId },
        data: { status: 'APPROVED' },
      });
    }

    revalidatePath('/admin/forms');
    return { success: true };
  } catch (err: any) {
    console.error('Error approving submission:', err);
    return { success: false, error: err.message || 'Failed to approve submission.' };
  }
}

// Reject a form submission
export async function rejectSubmission(submissionId: string) {
  try {
    await verifyAdmin();

    await db.formSubmission.update({
      where: { id: submissionId },
      data: { status: 'REJECTED' },
    });

    revalidatePath('/admin/forms');
    return { success: true };
  } catch (err: any) {
    console.error('Error rejecting submission:', err);
    return { success: false, error: err.message || 'Failed to reject submission.' };
  }
}

// Create a new member profile from scratch
export async function createMember(data: any) {
  try {
    await verifyAdmin();

    const newMember = await db.member.create({
      data: {
        names: data.names,
        phone: data.phone || null,
        address: data.address || null,
        husbandWife: data.husbandWife || null,
        spousePhone: data.spousePhone || null,
        parents: data.parents || [],
        children: data.children || [],
        siblings: data.siblings || [],
        witnesses: data.witnesses || [],
        nextOfKin: data.nextOfKin || [],
      },
    });

    revalidatePath('/admin/members');
    return { success: true, memberId: newMember.id };
  } catch (err: any) {
    console.error('Error creating member:', err);
    return { success: false, error: err.message || 'Failed to create member.' };
  }
}
