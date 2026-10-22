module tb;
reg a, b;
  wire y;
  xor2 dut(.a(a), .b(b), .y(y));
  initial begin
    a = 0; b = 0; #1; if (y !== 0) begin $display("FAIL 00"); $finish; end
    a = 0; b = 1; #1; if (y !== 1) begin $display("FAIL 01"); $finish; end
    a = 1; b = 0; #1; if (y !== 1) begin $display("FAIL 10"); $finish; end
    a = 1; b = 1; #1; if (y !== 0) begin $display("FAIL 11"); $finish; end
    $display("PASS xor from nand");
    $finish;
  end
endmodule
