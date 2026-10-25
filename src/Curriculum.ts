export interface LessonSection {
  title: string;
  text: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  goal: string;
  sections: LessonSection[];
  activity?: {
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  quiz?: {
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  isLab?: boolean; 
  labTask?: string; 
}

export interface Course {
  level: string;
  title: string;
  lessons: CourseLesson[];
}

export const CURRICULUM: Record<string, Course> = {
  "networking": {
    level: "Intermediate",
    title: "Networking Fundamentals",
    lessons: [
      {
        id: "networking-l1",
        title: "How networks connect devices",
        goal: "Identify network devices and trace a simple communication path.",
        isLab: true, 
        labTask: "Drag two End Devices (PCs) onto the canvas. Connect them with a Switch. Open the terminal on Host A and successfully ping Host B.",
        sections: [
          {
            title: "What is a network?",
            text: "A network is a group of connected devices that can exchange data. A local area network, or LAN, covers a limited area such as a home or classroom."
          },
          {
            title: "Switches, routers, and access points",
            text: "A typical Ethernet switch forwards frames within a LAN using MAC addresses. A router forwards IP packets between networks."
          }
        ]
      }
    ]
  },
  "command-line": {
    level: "Intermediate",
    title: "Intro to the Command Line",
    lessons: [
      {
        id: "command-line-l2",
        title: "Intro to the command line",
        goal: "Choose diagnostic commands and distinguish Windows from Cisco IOS modes.",
        isLab: true, 
        labTask: "Drag a Router onto the canvas. Open its terminal. Assign it the IP address 10.0.0.1 with a mask of 255.255.255.0 using the 'ip address' command.",
        sections: [
          {
            title: "Diagnostic commands",
            text: "Network administrators rely on CLIs (Command Line Interfaces) to configure and diagnose hardware. Commands like 'ipconfig' display local addressing information."
          }
        ]
      }
    ]
  },
  "network-security": {
    level: "Advanced",
    title: "Network Security & Firewalls",
    lessons: [
      {
        id: "network-security-l3",
        title: "Firewall rules and access control lists",
        goal: "Read ordered rules and design narrowly scoped access.",
        isLab: true,
        labTask: "Connect Host A to a Router. Open the Router terminal. Write a rule to drop ICMP traffic from Host A (192.168.1.10) to ANY destination.\n\nCommand: access-list 10 deny ICMP 192.168.1.10 ANY",
        sections: [
          {
            title: "Stateless and stateful filtering",
            text: "A stateless packet filter evaluates packets using fields and rules without remembering a connection."
          }
        ]
      }
    ]
  }
};