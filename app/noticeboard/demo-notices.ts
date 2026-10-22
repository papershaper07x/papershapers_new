import type {Notice} from './local-board';
// Never stored in the live database, never eligible for reservations or reporting.
const examples = [
 ['book-swap','A neighbourhood book swap','Community','Karnataka','Bengaluru','Bring a book, meet a neighbour. This fictional example shows how a community notice could look.',['Community','Events']],
 ['pottery','Try a beginner pottery session','Classes','Maharashtra','Pune','A fictional class listing. A real organiser would state timing, materials and total cost.',['Classes','Events']],
 ['lunch','A local lunch offer','Food','Delhi','New Delhi','A fictional food promotion. A real shop would explain prices, taxes and offer conditions.',['Food','Offers']],
 ['repair','Find a neighbourhood repair desk','Services','Tamil Nadu','Chennai','A fictional service notice. No repair provider, quote or booking is available here.',['Services']],
 ['walk','Plan a weekend community walk','Events','Telangana','Hyderabad','A fictional event showing organiser and area information. There is no real gathering.',['Events','Community']],
 ['craft','Discover a small craft pop-up','Offers','Gujarat','Ahmedabad','A fictional shop promotion, with no real inventory or discount behind it.',['Offers','Events']],
 ['idea','Share an idea for a reading corner','Ideas','West Bengal','Kolkata','A fictional neighbourhood idea. Real proposals should explain their purpose without collecting private data.',['Ideas','Community']],
] as const;
export const demoNotices:Notice[]=examples.map(([id,title,category,state,city,description,categories])=>({id:`demo-${id}`,title,description,place:'Fictional organiser — demo only',area:`Example neighbourhood, ${city}`,state,city,categories:[...categories],category,expires_at:'2099-01-01T00:00:00Z',has_image:false,distance_km:null,reservations_enabled:false,interested_count:0,view_count:0,request_count:0,demo:true}));
