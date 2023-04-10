import BaseObject from '../Object.js';
import InteractionProperty from './Property.js';

export class Active extends BaseObject {
  constructor(value) {
    super()
    this.setActive(value)
  }

  getActive() {
    return this.get(InteractionProperty.ACTIVE)
  }

  setActive(value) {
    this.set(InteractionProperty.ACTIVE, value)
  }
}
