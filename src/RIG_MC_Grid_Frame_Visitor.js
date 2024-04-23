/*	
	MC Grid Frame Visitor
	
	This Toon Boom Harmony shelf script is designed to help the creation of 2.5d characters in Harmony.
	It allows us to quickly jump to one of the sequential frames that arranged for the biaxial Master Controller Grid.
	Since Harmony's timeline is uniaxial, it is hard for us to browse or flip through the frames for both x and y axis.
	MC Grid Frame Visitor will create a x-y controller from a grid preset file.
	We can then use the red handle on the controller to quickly jump to its tagged frame.
	
		v1.02 - File open dialog now overlaps on top of the main dialog.
		v1.03 - Main dialog widget acts as a child of Harmony application.
		v1.04 - Red handle on the grid is in sync with the current frame on timeline.		
	
	
	Compatibility:
	
	Tested on Harmony Premium 16.0.3 and 17.0.0.

	
	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html	

	3) There is a folder named "src" inside the zip file. Copy all its contents directly to the folder above.	
	4) In Harmony, add RIG_MC_Grid_Frame_Visitor function to any toolbar.


	How to Create a Grid Preset:
	
	Grid preset files (*.gridPreset) can be created through Master Controller Grid Wizard:
	https://docs.toonboom.com/help/harmony-17/premium/reference/dialog-box/grid-wizard-dialog-box.html
	The file contains the geomatric information of the grid and the array of frame number that each point on the grid is tagged to.
	
	1) Select a node then open Master Controller Grid Wizard.	   
	2) On Load Preset dialog, create a new preset and then set the grid parameters.
	3) Once a grid is created, tag frames on all points on the grid.
	4) Click "Save Preset" button, input the preset's name then hit okay.
	   A grid preset file with the set parameters will be created on "gridPresets" folder inside your user script folder.
	
		
	How to Use MC Grid Frame Visitor Script:
	
	1) Run RIG_MC_Grid_Frame_Visitor.
	2) Click on the folder button on the screen right to load a grid preset file to the dialog.
	3) You can select a point on the grid by dragging the red handle onto a point, or selecting a point on the grid directly.
	4) Check "EZFlip" box below the folder button to turn on the easy flip mode.
	   In this mode, the handle's movement is constrained to one direction. This makes it easier for you to flip through a sequence.
	
	
	Author:

	Yu Ueda (raindropmoment.com)		
*/



function RIG_MC_Grid_Frame_Visitor()
{
	var scriptVer = "1.04";

	var userPref = loadPref();
	this.filePath = userPref.filePath;	
	this.scaleX = userPref.scaleX;
	this.scaleY = userPref.scaleY;	
	this.gridCenterX = userPref.gridCenterX;
	this.gridCenterY = userPref.gridCenterY;
	this.singleAxis = userPref.singleAxis;
	this.ptSize = 8;	


	// Refresh the dialog based on the opened preset file.
	var gridData = {};
	this.refreshDialog = function(boolRescale)
	{
		gridData = readJSON(this.filePath);
		if (gridData !== null)
		{
			this.ui.setWindowTitle(gridData.name + ".gridPreset - MC Grid Frame Visitor v" + scriptVer);	
			if (boolRescale)
				this.refreshScale();
			this.refreshView();
		}
	};


	// Each point pos on gridPreset are in fieldCoord system and too small on 1:1.
	// Scale them up in response to the QgraphicView widget's dimension.
	this.refreshScale = function()
	{
		var maxX = gridData.pos[0][0][0];
		var minX = maxX;
		var maxY = gridData.pos[0][0][1];
		var minY = maxY;
		
		for (var row in gridData.pos)
		{
			var uStart = gridData.pos[row][0];
			maxY = Math.max(maxY, uStart[1]);
			minY = Math.min(minY, uStart[1]);
		}
		for (var col in gridData.pos[0])
		{				
			var vStart = gridData.pos[0][col];
			maxX = Math.max(maxX, vStart[0]);
			minX = Math.min(minX, vStart[0]);
		}	
		var gridWidth = Math.abs(maxX -minX);
		var gridHeight = Math.abs(maxY -minY);
		var padding = 15;
		this.scaleX = (this.ui.xy_graphicView.width -padding) /gridWidth;
		this.scaleY = ((this.ui.xy_graphicView.height -padding) /gridHeight) *-1; // QGraphicsScene's y axis is *-1 of that in OGL.
		this.gridCenterX = (minX + maxX)/2 *this.scaleX;
		this.gridCenterY = (minY + maxY)/2 *this.scaleY;		
	};
	

	// Redraw the grid, points and the handle on QgraphicView widget.
	this.refreshView = function()
	{
		var view = this.ui.xy_graphicView;
		var gScene = new QGraphicsScene(view);
		view.setScene(gScene);


		// Draw horizontal grid
		var uLineColor = new QColor(90, 90, 90, 255);
		var uGridPen = new QPen(uLineColor);
		uGridPen.setWidth(1);
		
		for (var row in gridData.pos)
		{			
			var uMaxIdx = gridData.pos[row].length -1;
			var uStart = gridData.pos[row][0];
			var uEnd = gridData.pos[row][uMaxIdx];
			var uLine = new QGraphicsLineItem(uStart[0]*this.scaleX, uStart[1]*this.scaleY, uEnd[0]*this.scaleX, uEnd[1]*this.scaleY)
			uLine.setPen(uGridPen);
			gScene.addItem(uLine);		
		}
	

		// Draw vertical grid.
		var vLineColor = new QColor(128, 128, 128, 255);
		var vGridPen = new QPen(vLineColor);
		vGridPen.setWidth(2);		
		
		var vMaxIdx = gridData.pos.length -1;
		for (var col in gridData.pos[0])
		{				
			var vStart = gridData.pos[0][col];
			var vEnd = gridData.pos[vMaxIdx][col];
			var vLine = new QGraphicsLineItem(vStart[0]*this.scaleX, vStart[1]*this.scaleY, vEnd[0]*this.scaleX, vEnd[1]*this.scaleY)
			vLine.setPen(vGridPen);
			gScene.addItem(vLine);
		}


		// Draw dots on the grid.
		var bgColor = new QColor(69, 69, 69, 255)	
		var dotPen = new QPen(bgColor);
		dotPen.setWidth(2);
		var dotBrush = new QBrush(vLineColor);
		
		for (var row2 in gridData.pos)				
			for (var col2 in gridData.pos[row2])
			{
				var dot = gridData.pos[row2][col2];
				var ellipse = new QGraphicsEllipseItem(dot[0]*this.scaleX -this.ptSize/2, dot[1]*this.scaleY -this.ptSize/2, this.ptSize, this.ptSize);
				ellipse.setPen(dotPen);				
				ellipse.setBrush(dotBrush);
				gScene.addItem(ellipse);
			}

		var isCurFrameOutOfRange = true;

		// Move the controller based on the current frame on Timeline
		outer: for (var row in gridData.frames)
			for (var col in gridData.frames[row])
				if (gridData.frames[row][col] == frame.current())
				{
					isCurFrameOutOfRange = false;
					var posX = gridData.pos[row][col][0];
					var posY = gridData.pos[row][col][1];					
					this.ui.handle.setPos(posX *this.scaleX -this.ptSize/2, posY *this.scaleY -this.ptSize/2);
					break outer;
				}

		// If the current frame is not tagged any point on the grid, move it to the center:
		if (isCurFrameOutOfRange)
		{
			var handleX = this.gridCenterX;
			var handleY = this.gridCenterY;	
			this.ui.handle.setPos(handleX -this.ptSize/2, handleY -this.ptSize/2);
		}
		gScene.addItem(this.ui.handle);
	};
	
	

	// ------------------------------------------- Dialog definition ------------------------------------------->



	this.ui = new QWidget(getParentWidget());
	this.ui.setWindowTitle("MC_Grid_Frame_Visitor v" + scriptVer);		
	this.ui.setWindowFlags(Qt.Tool);
	this.ui.setAttribute(Qt.WA_DeleteOnClose);	
	
	if (about.isWindowsArch())
		this.ui.setGeometry (userPref.x +8, userPref.y +31, userPref.width, userPref.height);				
	else	
		this.ui.setGeometry (userPref.x, userPref.y, userPref.width, userPref.height);	

	this.ui.mainLayout = new QHBoxLayout(this.ui);	
	
	this.ui.xy_graphicView = new QGraphicsView();
	this.ui.xy_graphicView.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding);
	this.ui.xy_graphicView.setFrameStyle(QFrame.NoFrame);
	this.ui.mainLayout.addWidget(this.ui.xy_graphicView, 0, 0);
	
	this.ui.mainLayout.addSpacing(12);
	this.ui.rightLayout = new QVBoxLayout(this.ui);	
	this.ui.mainLayout.addLayout(this.ui.rightLayout);
	
	this.ui.loadButton = new QPushButton("");
	this.ui.loadButton.toolTip = "Load Grid Preset";
	this.ui.loadButton.setSizePolicy(QSizePolicy.Preferrd, QSizePolicy.Preferrd);
	var imagePath = specialFolders.userScripts + "/script-icons";
	this.ui.loadButton.icon = new QIcon(imagePath + "/RIG_MC_Grid_Frame_Visitor_Open.png");
	this.ui.loadButton.setIconSize(new QSize(20,20))
	this.ui.rightLayout.addWidget(this.ui.loadButton, 0, 0);

	this.ui.singleAxisCB = new QCheckBox("EZFlip");
	this.ui.singleAxisCB.toolTip = "Turn Easy Flip Mode";
	this.ui.singleAxisCB.checked = this.singleAxis;
	this.ui.rightLayout.addWidget(this.ui.singleAxisCB, 1, 0);	

	this.ui.handle = new QGraphicsEllipseItem(0, 0, this.ptSize, this.ptSize);
	this.ui.handle.setBrush(new QBrush(new QColor(255, 0, 0, 255)));						
	this.ui.handle.setFlag(QGraphicsItem.ItemIsMovable);
	
	this.refreshDialog(false);
	
	ui.show();
	
	
	// ------------------------------------------- Signals and callback functions ------------------------------------------->	


	this.loadButtonReleased = function()
	{
		var openPath = FileDialog.getOpenFileNames(this.filePath, "*.gridPreset", "Select a Grid Preset File to Load", this.ui);
		if (openPath == "")
			this.filePath = this.filePath;
		else
		{
			this.filePath = openPath;
			this.filePath = this.filePath[0];	
			this.refreshDialog(true);
		}
	};
	this.ui.loadButton.released.connect(this, this.loadButtonReleased);	


	this.flipCBStateChanged = function(state)
	{
		this.singleAxis = (state == 2);
	};	
	this.ui.singleAxisCB.stateChanged.connect(this, this.flipCBStateChanged);


	this.setHandlePosition = function()
	{
		outer: for (var row in gridData.frames)
			for (var col in gridData.frames[row])
				if (gridData.frames[row][col] == frame.current())
				{
					var posX = gridData.pos[row][col][0];
					var posY = gridData.pos[row][col][1];				
					this.ui.handle.setPos(posX *this.scaleX -this.ptSize/2, posY *this.scaleY -this.ptSize/2);
					break outer;
				}
	};
	this.scn = new SceneChangeNotifier(this.ui);
	this.scn.currentFrameChanged.connect(this, this.setHandlePosition);

	var main = this;
	var firstMovement = true;
	var lockAxis = null;
	var startPos = Point2d();	
	this.ui.xy_graphicView.mouseMoveEvent = function(pos)
	{
		if (!main.singleAxis)
			main.setFrameByPosition(pos, false);
		else if (firstMovement)
		{
			local = main.ui.xy_graphicView.mapToScene(pos.x(), pos.y());
			startPos = {x: local.x(), y: local.y()};
			firstMovement = false;
		}
		else
		{
			if (lockAxis == null)
				lockAxis = main.determinLockAxis(pos);				
			main.setFrameByPosition(pos, true);
		}
	}
	this.ui.xy_graphicView.mouseReleaseEvent = function()
	{
		firstMovement = true;
		lockAxis = null;
		startPos = Point2d();
	}
	this.ui.xy_graphicView.mousePressEvent = function(pos)
	{	
		main.setFrameByPosition(pos, false);
	}
	this.ui.resizeEvent = function()
	{
		main.refreshDialog(true);	
	}
	this.ui.closeEvent = function()	
	{
		main.scn.disconnectAll();
		main.savePref();
		main.ui.close();
	}


	// ------------------------------------------- Helper functions ------------------------------------------->	


	this.determinLockAxis = function(pos)
	{
		local = this.ui.xy_graphicView.mapToScene(pos.x(), pos.y());
		xDist = Math.abs(startPos.x -local.x());
		yDist = Math.abs(startPos.y -local.y());		
		return (xDist > yDist) ? "x" : "y";	
	};
	
	this.setFrameByPosition = function(pos, boolLockAxis)
	{
		// Find the point on the grid closest to the context cursor position,
		// and then set the point's tagged frame as the new current frame.
	
		local = this.ui.xy_graphicView.mapToScene(pos.x(), pos.y());
		var localX = local.x();
		var localY = local.y();		

		
		if (this.singleAxis && boolLockAxis)
		{	
			if (lockAxis == "x")
				localY = startPos.y;
			else
				localX = startPos.x;
		}

		var closeY = gridData.pos[0][0][1] *this.scaleY;
		var minDistY = Math.abs(closeY -localY);
		var frRow = 0;
		for (var row = 0; row < gridData.pos.length; row++)
		{
			var curY = gridData.pos[row][0][1] *this.scaleY;
			var curDistY = Math.abs(curY -localY);			
			if (curDistY <= minDistY)	
			{
				minDistY = curDistY;			
				closeY = curY;			
				frRow = row;
			}
		}
		
		var closeX = gridData.pos[frRow][0][0] *this.scaleX;
		var minDistX = Math.abs(closeX -localX);
		var frCol = 0;
		for (var col = 0; col < gridData.pos[frRow].length; col++)
		{
			var curX = gridData.pos[frRow][col][0] *this.scaleX;
			var curDistX = Math.abs(curX -localX);		
			if (curDistX <= minDistX)
			{
				minDistX = curDistX;			
				closeX = curX;
				frCol = col;
			}
		}
		
		//Backup:
		//this.ui.handle.setPos(closeX -this.ptSize/2, closeY -this.ptSize/2);	
		
		var taggedFr = gridData.frames[frRow][frCol];
		if (taggedFr > 0 && taggedFr <= frame.numberOf())
			frame.setCurrent(taggedFr);
	};

	function readJSON(filename)
	{
		var file = new File(filename);

		try
		{
			if (file.exists)
			{
				file.open(1);
				var string = file.read();
				file.close();
				return JSON.parse(string);
			}
		}
		catch (err)
		{}
		return null;
	}	
		
	function loadPref()	
	{	
		var pref = {};		
		var localPath = specialFolders.userScripts + "/YU_Script_Prefs";
		localPath += "/RIG_MC_Grid_Frame_Selector_pref";
		var file = new File(localPath);
	
		try
		{
			if (file.exists)
			{
				file.open(1) // read only
				var sd = file.readLines();
				file.close();
				
				pref.filePath = sd[0];			
				pref.width = Number(sd[1]);
				pref.height = Number(sd[2]);			
				pref.x = Number(sd[3]);
				pref.y = Number(sd[4]);
				pref.scaleX = Number(sd[5]);
				pref.scaleY = Number(sd[6]);
				pref.gridCenterX = Number(sd[7]);
				pref.gridCenterY = Number(sd[8]);
				pref.singleAxis = (sd[9] == "true");
			}
		}
		catch (err){}
		
		if (Object.keys(pref).length == 0)
		{	
			MessageLog.trace("MC Grid Frame Selector save data is not found. Loading default setting.");
			var preset = {};
			preset.filePath = specialFolders.userScripts + "/gridPresets";
			preset.width = 300;
			preset.height = 200;			
			preset.x = 300;
			preset.y = 200;	
			preset.scaleX = 50;
			preset.scaleY = -50;
			preset.gridCenterX = 0;
			preset.gridCenterY = 0;	
			preset.singleAxis = false;
			pref = preset;
		}		
		return pref;
	}
	
	this.savePref = function()
	{
		var localPath = specialFolders.userScripts + "/YU_Script_Prefs";
		var dir = new Dir;
		if (!dir.fileExists(localPath))
			dir.mkdir(localPath);
		localPath += "/RIG_MC_Grid_Frame_Selector_pref";		
		var file = new File(localPath);
		
		try
		{	
			file.open(2); // write only
			file.writeLine(this.filePath);
			file.writeLine(this.ui.width);
			file.writeLine(this.ui.height);	
			file.writeLine(this.ui.x);			
			file.writeLine(this.ui.y);
			file.writeLine(this.scaleX);			
			file.writeLine(this.scaleY);	
			file.writeLine(this.gridCenterX);
			file.writeLine(this.gridCenterY);
			file.write(this.singleAxis);	
			file.close();
		}
		catch (err){}
	};	
	
	function getParentWidget()
	{
		var topWidgets = QApplication.topLevelWidgets();
		for (var i in topWidgets)
			if (topWidgets[i] instanceof QMainWindow && !topWidgets[i].parentWidget())
				return topWidgets[i];
		return "";
	};
}