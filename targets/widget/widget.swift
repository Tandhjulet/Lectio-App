//
//  widget.swift
//  widget
//

import WidgetKit
import SwiftUI
import Intents

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 3 {
          lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }
            
        return SimpleEntry(date: Date(),
                    lookAhead: lookAhead,
                    modules: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
      
      let userDefaults = UserDefaults.init(suiteName: "group.com.tandhjulet.lectio360.widget");
      if(userDefaults != nil) {
          let entryDate = Date()
          if let savedData = userDefaults!.value(forKey: "skema") as? String {
              let decoder = JSONDecoder();
              decoder.dateDecodingStrategy = .millisecondsSince1970
              let data = savedData.data(using: .utf8);
              let parsedData = try? decoder.decode([String: [Module]].self, from: data!)
                  
              let currentDate = Calendar.current.component(.day, from: entryDate)
              
              var lookAhead: [Date] = []
              for hourOffset in 0 ..< 3 {
                lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
              }
            
              let modules = parsedData?[String(currentDate)]
              
              let entry = SimpleEntry(date: entryDate,
                                    lookAhead: lookAhead,
                                      modules: (modules ?? [])!)
                  
              completion(entry)
              
          } else {
              var lookAhead: [Date] = []
              let entryDate = Date()
            
              for hourOffset in 0 ..< 3 {
                lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
              }
            
              let entry = SimpleEntry(date: entryDate,
                                    lookAhead: lookAhead,
                                    modules: [])
              completion(entry)
          }
      } else {
          let entry = SimpleEntry(date: Date(),
                                lookAhead: [],
                                  modules: [], error: true)
          completion(entry)
      }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let userDefaults = UserDefaults.init(suiteName: "group.com.tandhjulet.lectio360.widget");
        if(userDefaults != nil) {
            let entryDate = Date()
            if let savedData = userDefaults!.value(forKey: "skema") as? String {
                let decoder = JSONDecoder();
                decoder.dateDecodingStrategy = .millisecondsSince1970
                let data = savedData.data(using: .utf8);
                let parsedData = try? decoder.decode([String: [Module]].self, from: data!)
                
                let currentDate = Calendar.current.component(.day, from: entryDate)
                let currentHour = Calendar.current.component(.hour, from: entryDate)
                let requestAfter = Calendar.current.date(byAdding: .hour, value: currentHour > 7 && currentHour < 16 ? 1 : 3, to: entryDate)!
                
                var lookAhead: [Date] = []
                for hourOffset in 0 ..< 3 {
                  lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                }
              
                let modules = parsedData?[String(currentDate)];
                
                let entry = SimpleEntry(date: entryDate,
                                      lookAhead: lookAhead,
                                        modules: (modules ?? [])!)
                    
                let timeline = Timeline(entries: [entry], policy: .after(requestAfter))
                completion(timeline)
                
            } else {
                var lookAhead: [Date] = []
                let entryDate = Date()
              
                for hourOffset in 0 ..< 3 {
                  lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                }
              
                let entry = SimpleEntry(date: entryDate,
                                      lookAhead: lookAhead,
                                      modules: [])
                let timeline = Timeline(entries: [entry], policy: .after(lookAhead.last!))
                completion(timeline)
            }
        } else {
            let date = Calendar.current.date(byAdding: .hour, value: 2, to: Date())
            
            let entry = SimpleEntry(date: Date(),
                                  lookAhead: [],
                                    modules: [], error: true)
            let timeline = Timeline(entries: [entry], policy: .after(date!))
            completion(timeline)
        }
    }
}

extension Date {

    static func - (lhs: Date, rhs: Date) -> TimeInterval {
        return lhs.timeIntervalSinceReferenceDate - rhs.timeIntervalSinceReferenceDate
    }
  
    func dayOfWeek() -> String? {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "da-DK")
        dateFormatter.dateFormat = "EEEE"
        return dateFormatter.string(from: self)
    }

}

enum Status: String, Decodable {
  case changed
  case cancelled
  case normal
  
  init(from decoder: Decoder) throws {
    let label = try decoder.singleValueContainer()
    .decode(String.self)

    switch label {
      case "changed": self = .changed;
      case "cancelled": self = .cancelled;
      case "normal": self = .normal;
      default:
        self = .normal;
    }
  }
}

struct Module: Decodable {
    let start: Date
    let end: Date
  
    let title: String
    let status: Status
  
    let _id: String
  
    let width: CGFloat
    let left: CGFloat
}

struct SimpleEntry: TimelineEntry {
    let date: Date
  
    let lookAhead: Array<Date>
    let modules: Array<Module>
    
    var error: Bool = false
}

struct widgetEntryView : View {
    var entry: Provider.Entry
  
    func calculateTop(module: Module, first: Date, geoHeight: CGFloat) -> CGFloat {
      let diff = module.start - first;
      var top = ((diff+(2))/(60*60*2)) * (geoHeight);
      top = top < 0 ? 0 : top;
      
      return top;
    }
  
    private var ItemSeperator: some View {
      VStack(alignment: .leading, spacing: 0) {
        ForEach(entry.lookAhead, id: \.self) { lookAhead in
          Color.clear
            .frame(
              maxWidth: 0,
              maxHeight: 0
            )
          
          Divider().frame(maxWidth: .infinity, maxHeight: 10)
             
          if entry.lookAhead.last.self != lookAhead.self {
            Spacer()
          }
        }
      }
    }
    
    var body: some View {
      if #available(iOSApplicationExtension 17.0, *), (entry.lookAhead.count > 0) {
        VStack {
          HStack(spacing: 0) {
            Text((entry.lookAhead.first ?? Date()).dayOfWeek()!)
              .font(.system(size: 9))
              .fontWeight(.heavy)
            
            Spacer()
            
            Text((entry.lookAhead.first ?? Date()).formatted(date: .numeric, time: .omitted))
              .font(.system(size: 9))
              .fontWeight(.regular)
          }
          
          HStack(spacing: 5) {
            if(!entry.error) {
              GeometryReader { geo in
                ZStack(alignment: .leading) {
                  ItemSeperator.frame(width: geo.size.width)
                  
                  ForEach(entry.modules, id: \._id) { module in
                    if(module.end > entry.lookAhead.first! && module.start < entry.lookAhead.last!) {
                      let top = calculateTop(module: module, first: entry.lookAhead.first!, geoHeight: geo.size.height);
                      
                      VStack(spacing: 0) {
                        Color.clear
                          .opacity(0)
                          .frame(
                            maxWidth: .infinity,
                            maxHeight: top
                          )
                        
                        HStack(spacing: 0) {
                          Color.clear
                            .frame(width: module.left * geo.size.width, height: 0)
                          
                          ZStack(alignment: .topLeading) {
                            Rectangle()
                              .fill(module.status == .normal ? Color("Primary") : module.status == .changed ? Color.yellow : Color("Red"))
                              .opacity(1)
                              .clipShape(
                                .rect(
                                  topLeadingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                  bottomLeadingRadius: 3,
                                  bottomTrailingRadius: 3,
                                  topTrailingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                  style: .continuous
                                )
                              )
                              .frame(
                                width: .infinity, height: .infinity
                              )
                            
                            if(calculateHeight(start: module.start, end: module.end) * geo.size.height > 10+4*2) {
                              ZStack {
                                Text(module.title)
                                  .font(.system(size: 9, weight: .bold))
                                  .multilineTextAlignment(.leading)
                                  .foregroundStyle(Color.white)
                                  .minimumScaleFactor(0.6)
                              }.padding(4)
                            }
                          }
                          .frame(width: module.width * geo.size.width, height: calculateHeight(start: module.start, end: module.end) * geo.size.height)
                          
                          Spacer(minLength: 0)
                        }
                        
                        Spacer(minLength: 0)
                      }
                    }
                  }
                }
                .frame(
                  maxWidth: .infinity,
                  maxHeight: .infinity
                )
              }
              
              VStack(alignment: .leading, spacing: 0) {
                ForEach(entry.lookAhead, id: \.self) { lookAhead in
                  Color.clear
                    .frame(
                      maxWidth: 0,
                      maxHeight: 0
                    )
                  
                  let time = lookAhead.formatted(date: .omitted, time: .shortened)
                  
                  
                  Text(time.replacingOccurrences(of: ".", with: ":"))
                    .font(.system(
                      size:8.5
                    ))
                    .multilineTextAlignment(.trailing)
                    .frame(height: 10)
                    .foregroundColor(.secondary)
                  
                  if entry.lookAhead.last.self != lookAhead.self {
                    Spacer()
                  }
                }
              }
            } else {
              
              Text("Der opstod en fejl").frame(
                maxWidth: .infinity,
                maxHeight: .infinity,
                alignment: .center
              ).multilineTextAlignment(.center)
              
            }
          }
        }.containerBackground(for: .widget, content: {Color("AccentColor")})
        
    } else {
      VStack {
        Text("Der opstod en fejl")
          .multilineTextAlignment(.center)
      }.containerBackground(for: .widget, content: {Color("AccentColor")})
    };
  }
}

@main
struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
        }
        .configurationDisplayName("Skemaoversigt")
        .description("Dan dig et overblik over dit skema")
    }
}

func calculateHeight(start: Date, end: Date) -> CGFloat {
  let compareTo: Date = start < Date() ? Date() : start;
  let diff = (end - compareTo) / (60*60*2);
  return diff;
}

struct widget_Previews: PreviewProvider {
    static func getEntry() -> SimpleEntry {
      var entry: SimpleEntry = SimpleEntry(date: Date(),
                                           lookAhead: [],
                                             modules: [], error: true);
      
      let userDefaults = UserDefaults.init(suiteName: "group.com.tandhjulet.lectio360.widget");
      if(userDefaults != nil) {
        let entryDate = Date()
        let currentDate = Calendar.current.component(.day, from: entryDate)
        
        let savedData = """
{"17":[{"_id":"/lectio/572/privat_aftale.aspx?aftaleid=66603340451&amp;prevurl=SkemaNy.aspx%3fweek%3d252024:1","end":1718578838781,"start":1718575298781,"left":0,"width":1,"status":"normal","title":"test"}],"18":[{"_id":"/lectio/572/privat_aftale.aspx?aftaleid=66603340451&amp;prevurl=SkemaNy.aspx%3fweek%3d252024:0","end":1718578838781,"start":1718575298781,"left":0,"width":1,"status":"normal","title":"test"}],"19":[],"20":[],"21":[]}
"""

        let decoder = JSONDecoder();
        decoder.dateDecodingStrategy = .millisecondsSince1970
        let data = savedData.data(using: .utf8);
        let parsedData = try? decoder.decode([String: [Module]].self, from: data!)
        
        var lookAhead: [Date] = []
        for hourOffset in 0 ..< 3 {
          lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }
        
        
        if parsedData != nil {
          let modules = parsedData?[String(currentDate)]
                    
          entry = SimpleEntry(date: Date(),
                                lookAhead: lookAhead,
                              modules: (modules ?? [])!, error: false)
        } else {
          print("nil")
        }
                  
        //entry = SimpleEntry(date: entryDate,
        //                      lookAhead: lookAhead,
        //                        modules: parsedData[String(currentDate)] ?? [])
          
      } else {
          entry = SimpleEntry(date: Date(),
                                lookAhead: [],
                                  modules: [], error: true)
      }
      
      return entry;
    }
  
    static var previews: some View {
        widgetEntryView(entry: getEntry())
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
