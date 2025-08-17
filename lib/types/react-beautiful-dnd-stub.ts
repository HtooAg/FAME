// Stub for react-beautiful-dnd to fix sample UI compilation
import React from "react";

export interface DragDropContextProps {
	onDragEnd: (result: any) => void;
	children: React.ReactNode;
}

export interface DroppableProps {
	droppableId: string;
	children: (provided: any) => React.ReactNode;
}

export interface DraggableProps {
	draggableId: string;
	index: number;
	children: (provided: any, snapshot: any) => React.ReactNode;
}

export const DragDropContext: React.FC<DragDropContextProps> = ({
	children,
}) => {
	return React.createElement(React.Fragment, null, children);
};

export const Droppable: React.FC<DroppableProps> = ({ children }) => {
	return children({});
};

export const Draggable: React.FC<DraggableProps> = ({ children }) => {
	return children({}, {});
};
