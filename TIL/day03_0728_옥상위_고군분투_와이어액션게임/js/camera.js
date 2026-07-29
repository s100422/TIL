// 오토런 카메라 스크롤.
//
// 카메라는 앞으로만 나아간다(뒤로 물러나지 않는다). 스윙 중에는 캐릭터가
// 진자 운동으로 좌우로 흔들리는데, 그때마다 카메라가 따라 흔들리면
// 화면이 덜컹거려 조준을 방해한다. 그래서 '지금까지 도달한 가장 먼 지점'만
// 기억하고 그보다 뒤로는 결코 스크롤하지 않는다.

import { TUNING } from './config.js';

/** 새 카메라를 만든다. 스테이지 시작 시 항상 x=0에서 다시 시작한다. */
export function createCamera() {
  return { x: 0 };
}

/** 플레이어 위치에 맞춰 카메라를 갱신한다. */
export function updateCamera(camera, player) {
  const target = Math.max(0, player.x - TUNING.CAMERA_FOLLOW_X);
  if (target > camera.x) camera.x = target;
}
