import type { ToolStatus } from '../../types/index.js';
export class OpenScapAdapter { name='OpenSCAP'; async isAvailable(){ return false; } async run(): Promise<ToolStatus> { return { name:this.name, available:false, status:'FUTURE', mode:'future', notes:['OpenSCAP is future enterprise compliance adapter.'] }; } }
