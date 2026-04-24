// Cookie helper — extracted to avoid circular dependency
const IS_PROD = process.env.NODE_ENV === 'production';

export function setAuthCookie(res, token) {
    res.cookie('bc_auth', token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/',
    });
}

export function clearAuthCookie(res) {
    // Attempt deletion with current settings
    res.clearCookie('bc_auth', {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/'
    });
    // Attempt deletion backwards-compatible with older cookies
    // (Browsers require exact attribute matches to overwrite/delete cookies)
    if (IS_PROD) {
        res.clearCookie('bc_auth', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });
    }
}
