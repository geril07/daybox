/**
 * Horizontal frame shared by the task column and the fixed timer footer.
 * Max width, centering and responsive gutters live here only, so both
 * surfaces keep the same visible edges at every breakpoint.
 */
export const workspaceColumnClass = 'mx-auto w-full max-w-[760px] px-4 md:px-7'

/**
 * Mirrors the main scroller's reserved scrollbar gutter on a sibling that
 * does not scroll. The footer column then centers inside the same content
 * width as the task column, whether or not the task list overflows.
 */
export const scrollGutterMirrorClass =
  'scrollbar-gutter-stable overflow-x-hidden overflow-y-auto'
