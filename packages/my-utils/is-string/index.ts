import { cloneDeep } from 'lodash'
import axios from 'axios'  // 幽灵依赖：用了但没声明

export const isString = (val: unknown): val is string => typeof val === 'string'

// 演示 SDK 场景：使用根目录提升的依赖
export const cloneString = (val: string) => cloneDeep(val)
export const fetchData = () => axios.get('/api/data')  // 使用 axios