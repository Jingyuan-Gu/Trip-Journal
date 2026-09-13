export type JournalStyleId = 'route_journal'|'soft_scrapbook'|'urban_grunge';
export interface JournalStylePrompt { styleId:JournalStyleId; name:string; shortDescription:string; promptTemplate:string }
export const stylePrompts:Record<JournalStyleId,JournalStylePrompt>={
 route_journal:{styleId:'route_journal',name:'推荐｜手绘行程手账',shortDescription:'沿着时间线记录今天真实走过的每一站',promptTemplate:'暖米黄色纸张、手绘弯曲路线、圆点、箭头、地图 pin；按时间顺序展示多个 TripStop，每站包含时间、地点、代表照片和短配文，做成一页有叙事感的旅行手账，不做规整网格。'},
 soft_scrapbook:{styleId:'soft_scrapbook',name:'清新旅行手账',shortDescription:'奶油纸张、胶带与轻柔错落照片',promptTemplate:'奶油米白方格纸、撕纸边缘、低饱和胶带、便签和小涂鸦；照片大小不一、轻微旋转和重叠，像亲手制作的生活感旅行手账。'},
 urban_grunge:{styleId:'urban_grunge',name:'复古城市手账',shortDescription:'街头杂志、票根与复古拼贴',promptTemplate:'旧米白纸张、黑灰纸块、粗体杂志标题、ticket、stamp、胶片边框和城市标签；画面密集有层次，适合街景、建筑、夜景和美食。'}
};
