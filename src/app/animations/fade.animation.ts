import { Animation, createAnimation } from '@ionic/angular/standalone';

export const fadeAnimation = (_: HTMLElement, opts: any): Animation => {
  const rootTransition = createAnimation()
    .duration(200)
    .easing('ease-in-out');

  const enteringElement = opts.enteringEl;
  const leavingElement = opts.leavingEl;

  if (enteringElement) {
    const enterTransition = createAnimation()
      .addElement(enteringElement)
      .fromTo('opacity', 0, 1);
    rootTransition.addAnimation(enterTransition);
  }

  if (leavingElement) {
    const leaveTransition = createAnimation()
      .addElement(leavingElement)
      .fromTo('opacity', 1, 0);
    rootTransition.addAnimation(leaveTransition);
  }

  return rootTransition;
};
