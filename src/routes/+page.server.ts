import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getActiveShows, addSubscription } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	return { shows: getActiveShows() };
};

export const actions: Actions = {
	subscribe: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const keyword = String(form.get('keyword') ?? '').trim();
		const source = String(form.get('source') ?? '').trim();

		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			return fail(400, { error: '請輸入有效的 Email' });
		}
		if (!keyword && !source) {
			return fail(400, { error: '請至少設定一個關鍵字或來源' });
		}
		addSubscription(email, keyword || null, source || null);
		return { success: true, email };
	}
};
