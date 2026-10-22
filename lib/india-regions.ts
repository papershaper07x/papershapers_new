// Curated discovery presets, not population rankings or an exhaustive address database.
export const indiaRegions:Record<string,readonly string[]> = {
 'Andaman and Nicobar Islands':['Sri Vijaya Puram'],
 'Andhra Pradesh':['Visakhapatnam','Vijayawada','Tirupati','Guntur'],
 'Arunachal Pradesh':['Itanagar'], 'Assam':['Guwahati','Dibrugarh'],
 'Bihar':['Patna','Gaya'], 'Chandigarh':['Chandigarh'],
 'Chhattisgarh':['Raipur','Bhilai'],
 'Dadra and Nagar Haveli and Daman and Diu':['Daman','Silvassa'],
 'Delhi':['New Delhi','Delhi'], 'Goa':['Panaji','Margao'],
 'Gujarat':['Ahmedabad','Surat','Vadodara','Rajkot'],
 'Haryana':['Gurugram','Faridabad','Panipat'], 'Himachal Pradesh':['Shimla','Dharamshala'],
 'Jammu and Kashmir':['Srinagar','Jammu'], 'Jharkhand':['Ranchi','Jamshedpur'],
 'Karnataka':['Bengaluru','Mysuru','Mangaluru','Hubballi'],
 'Kerala':['Kochi','Thiruvananthapuram','Kozhikode'], 'Ladakh':['Leh','Kargil'],
 'Lakshadweep':['Kavaratti'], 'Madhya Pradesh':['Indore','Bhopal','Jabalpur'],
 'Maharashtra':['Mumbai','Pune','Nagpur','Nashik','Thane'],
 'Manipur':['Imphal'], 'Meghalaya':['Shillong'], 'Mizoram':['Aizawl'],
 'Nagaland':['Kohima','Dimapur'], 'Odisha':['Bhubaneswar','Cuttack'],
 'Puducherry':['Puducherry'], 'Punjab':['Ludhiana','Amritsar','Jalandhar'],
 'Rajasthan':['Jaipur','Jodhpur','Udaipur'], 'Sikkim':['Gangtok'],
 'Tamil Nadu':['Chennai','Coimbatore','Madurai','Tiruchirappalli'],
 'Telangana':['Hyderabad','Warangal'], 'Tripura':['Agartala'],
 'Uttar Pradesh':['Lucknow','Noida','Kanpur','Varanasi','Agra'],
 'Uttarakhand':['Dehradun','Haridwar'], 'West Bengal':['Kolkata','Siliguri'],
};
export function validateRegion(state:unknown,city:unknown) {
 if(state===undefined && city===undefined)return {state:null,city:null};
 if(typeof state!=='string'||!Object.hasOwn(indiaRegions,state))throw new Error('Choose a supported state or union territory.');
 if(typeof city!=='string'||city.trim().length<2||city.trim().length>80||/[\u0000-\u001f<>]/.test(city))throw new Error('Choose or enter a city.');
 const name=city.trim();
 if(Object.entries(indiaRegions).some(([region,cities])=>region!==state&&cities.includes(name)))throw new Error('The selected city belongs to another state or union territory.');
 return {state,city:name};
}
