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
    res.clearCookie('bc_auth', {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/'
    });
}
