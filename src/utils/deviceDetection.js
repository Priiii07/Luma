export const isMobileDevice = () => {
    const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
    const mobileScreenWidth = window.innerWidth < 768
    return mobileUserAgent || mobileScreenWidth
}

export const isTouchDevice = () => {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    )
}
